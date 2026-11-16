"""Selective ChEMBL export/import through loopback HTTP; no keys are exported.

Run from the operator's Windows terminal. Target HTTP is an SSH local forward.
See docs/infrastructure/local-vm/CHEMBL-TRANSFER.md for the manual procedure.
"""
import argparse
import getpass
import hashlib
import http.client
import json
from pathlib import Path
import sys
import time
import urllib.error

from meili_logical_transfer import Client, ApiError

INDEXES = ('molecule_previews_chembl_36', 'molecule_details_chembl_36')
LOGS = ('logs_staging', 'security_logs_staging', 'logs_production', 'security_logs_production')


class TransferClient(Client):
    """Retry only idempotent GET transport failures; never repeat a POST/PATCH."""
    def __init__(self, endpoint, key):
        super().__init__(endpoint, key, timeout=180)

    def call(self, path, body=None, method=None):
        is_read = body is None and method in (None, 'GET')
        attempts = 4 if is_read else 1
        for attempt in range(attempts):
            try:
                return super().call(path, body, method)
            except (urllib.error.URLError, OSError, http.client.HTTPException) as error:
                if attempt + 1 == attempts:
                    error.transfer_operation = path.split('?')[0]
                    error.transfer_method = method or ('GET' if body is None else 'POST')
                    raise
                reason = getattr(error, 'reason', error)
                emit(phase='read-transport-retry', operation=path.split('?')[0],
                     attempt=attempt + 1, errorType=type(error).__name__,
                     reasonType=type(reason).__name__, errno=getattr(reason, 'errno', None))
                time.sleep(2 ** (attempt + 1))


def emit(**value):
    print(json.dumps(value), flush=True)


def save(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=True), encoding='utf-8')
    temporary.replace(path)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def wait(client, task):
    deadline = time.monotonic() + 7200
    last = 0
    while time.monotonic() < deadline:
        value = client.call('/tasks/' + str(task['taskUid']))
        if value['status'] == 'succeeded':
            return
        if value['status'] in ('failed', 'canceled'):
            raise ValueError('task-failed-' + str(value.get('error', {}).get('code', 'unknown')))
        if time.monotonic() - last > 15:
            emit(taskUid=task['taskUid'], status=value['status'])
            last = time.monotonic()
        time.sleep(1)
    raise ValueError('task-timeout-preserve-journal')


def export(client, root):
    version = client.call('/version')['pkgVersion']
    if version != '1.14.0':
        raise ValueError('source-version-requires-review')
    if client.call('/tasks?statuses=enqueued,processing&limit=1')['total']:
        raise ValueError('source-has-pending-tasks')
    root.mkdir(parents=True, exist_ok=False)
    manifest = {'version': version, 'indexes': []}
    for uid in INDEXES:
        base = '/indexes/' + uid
        metadata = client.call(base)
        settings = client.call(base + '/settings')
        if settings.get('embedders'):
            raise ValueError('embedders-require-separate-review')
        if not metadata.get('primaryKey'):
            raise ValueError('missing-primary-key')
        before = client.call(base + '/stats')
        if not before['numberOfDocuments']:
            raise ValueError('source-index-empty-' + uid)
        count = 0
        files = []
        for number in range(0, before['numberOfDocuments'], 5000):
            response = client.call(base + '/documents?limit=5000&offset=' + str(number))
            documents = response['results']
            if response['total'] != before['numberOfDocuments'] or not documents:
                raise ValueError('source-changed-during-export')
            filename = uid + '-' + str(number).zfill(9) + '.json'
            path = root / filename
            with path.open('x', encoding='utf-8') as stream:
                json.dump(documents, stream, ensure_ascii=True, separators=(',', ':'))
            files.append({'file': filename, 'sha256': digest(path), 'count': len(documents)})
            count += len(documents)
            emit(phase='export', index=uid, documents=count, total=before['numberOfDocuments'])
        if count != before['numberOfDocuments'] or client.call(base)['updatedAt'] != metadata['updatedAt']:
            raise ValueError('source-changed-during-export')
        if client.call(base + '/settings') != settings:
            raise ValueError('source-settings-changed')
        manifest['indexes'].append({'uid': uid, 'primaryKey': metadata['primaryKey'],
                                    'settings': settings, 'count': count, 'files': files})
    if client.call('/tasks?statuses=enqueued,processing&limit=1')['total']:
        raise ValueError('source-has-pending-tasks')
    save(root / 'manifest.json', manifest)
    emit(status='exported', directory=str(root), indexes=len(INDEXES))


def get_index(client, uid):
    try:
        return client.call('/indexes/' + uid)
    except ApiError as error:
        if error.api_code == 'index_not_found':
            return None
        raise


def load_bundle(root):
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    if tuple(item['uid'] for item in manifest['indexes']) != INDEXES:
        raise ValueError('unexpected-index-set')
    for item in manifest['indexes']:
        total = 0
        emit(phase='validating-bundle', index=item['uid'], totalBatches=len(item['files']))
        for number, part in enumerate(item['files'], 1):
            if Path(part['file']).name != part['file']:
                raise ValueError('invalid-batch-path')
            if digest(root / part['file']) != part['sha256']:
                raise ValueError('batch-checksum-mismatch')
            documents = json.loads((root / part['file']).read_text(encoding='utf-8'))
            if len(documents) != part['count']:
                raise ValueError('batch-count-mismatch')
            total += len(documents)
            if number % 50 == 0 or number == len(item['files']):
                emit(phase='validating-bundle', index=item['uid'], checkedBatches=number,
                     totalBatches=len(item['files']))
        if total != item['count']:
            raise ValueError('index-count-mismatch')
    return manifest


def import_bundle(client, root, retry_failed_task=None):
    # Reject bad credentials/endpoint versions before reading gigabytes of batches.
    version = client.call('/version')['pkgVersion']
    if version != '1.14.0':
        raise ValueError('target-version-mismatch')
    manifest = load_bundle(root)  # Validate every batch before the first target write.
    if version != manifest['version']:
        raise ValueError('target-version-mismatch')
    journal_path = root / 'import-journal.json'
    identity = digest(root / 'manifest.json')
    journal = json.loads(journal_path.read_text()) if journal_path.exists() else {'manifest': identity, 'indexes': {}}
    if journal['manifest'] != identity:
        raise ValueError('journal-manifest-mismatch')
    if retry_failed_task is not None:
        matches = [(uid, state) for uid, state in journal['indexes'].items()
                   if state.get('pending', {}).get('taskUid') == retry_failed_task]
        if len(matches) != 1:
            raise ValueError('retry-task-not-pending-in-journal')
        uid, state = matches[0]
        item = next(item for item in manifest['indexes'] if item['uid'] == uid)
        task = client.call('/tasks/' + str(retry_failed_task))
        if (task.get('status') != 'failed' or task.get('indexUid') != uid
                or task.get('type') != 'documentAdditionOrUpdate'
                or (task.get('error') or {}).get('code') != 'no_space_left_on_device'
                or state['pending']['label'] not in [part['file'] for part in item['files']]):
            raise ValueError('retry-requires-failed-document-task-with-no-space')
        state.setdefault('failedTasks', []).append(dict(state['pending'], code='no_space_left_on_device'))
        del state['pending']
        save(journal_path, journal)
    # Never adopt an existing ChEMBL index without this bundle's journal.
    for item in manifest['indexes']:
        if get_index(client, item['uid']) and item['uid'] not in journal['indexes']:
            raise ValueError('target-index-already-exists-' + item['uid'])
    for uid in LOGS:
        existing = get_index(client, uid)
        if existing and existing['primaryKey'] != 'id':
            raise ValueError('unexpected-log-primary-key-' + uid)
    for uid in LOGS:
        if not get_index(client, uid):
            wait(client, client.call('/indexes', {'uid': uid, 'primaryKey': 'id'}, 'POST'))
        emit(phase='logs-ready', index=uid)
    for item in manifest['indexes']:
        uid = item['uid']
        base = '/indexes/' + uid
        state = journal['indexes'].setdefault(uid, {'completed': []})
        save(journal_path, journal)
        # Pending task is persisted before waiting; a timeout resumes that exact task.
        def execute(label, path, body, method):
            if label in state['completed']:
                return
            if 'pending' not in state:
                emit(phase='submitting-task', index=uid, batch=label, method=method)
                task = client.call(path, body, method)
                state['pending'] = {'label': label, 'taskUid': task['taskUid']}
                save(journal_path, journal)
            if state['pending']['label'] != label:
                raise ValueError('unexpected-pending-task')
            wait(client, state['pending'])
            state['completed'].append(label)
            del state['pending']
            save(journal_path, journal)
        execute('create', '/indexes', {'uid': uid, 'primaryKey': item['primaryKey']}, 'POST')
        execute('settings', base + '/settings', item['settings'], 'PATCH')
        emit(phase='resuming-index', index=uid,
             completedBatches=sum(part['file'] in state['completed'] for part in item['files']),
             totalBatches=len(item['files']), pendingTaskUid=state.get('pending', {}).get('taskUid'))
        for number, part in enumerate(item['files'], 1):
            if part['file'] in state['completed']:
                continue
            documents = json.loads((root / part['file']).read_text(encoding='utf-8'))
            execute(part['file'], base + '/documents', documents, 'POST')
            emit(phase='import', index=uid, completedBatches=number, totalBatches=len(item['files']))
        if client.call(base + '/stats')['numberOfDocuments'] != item['count']:
            raise ValueError('target-document-count-mismatch')
        if client.call(base)['primaryKey'] != item['primaryKey'] or client.call(base + '/settings') != item['settings']:
            raise ValueError('target-metadata-mismatch')
        emit(phase='index-verified', index=uid, documents=item['count'])
    emit(status='passed', chemblIndexes=2, logIndexes=4, apiKeysChanged=False)


def read_key(from_stdin, prompt):
    key = sys.stdin.read().rstrip('\r\n') if from_stdin else getpass.getpass(prompt)
    if not key:
        raise ValueError('empty-key')
    if any(ord(char) < 32 or ord(char) == 127 for char in key):
        raise ValueError('invalid-key-control-character')
    return key


def failure_details(error):
    # Only API identifiers; never include response bodies or authorization headers.
    reason = getattr(error, 'reason', error)
    result = dict(status='failed', code=str(error) if isinstance(error, ValueError) else type(error).__name__,
                  automaticCleanup=False, reasonType=type(reason).__name__, errno=getattr(reason, 'errno', None))
    if isinstance(error, ApiError):
        result.update(operation=error.operation, apiCode=error.api_code)
    elif hasattr(error, 'transfer_operation'):
        result.update(operation=error.transfer_operation, method=error.transfer_method,
                      requestMayHaveBeenAccepted=error.transfer_method not in ('GET', 'HEAD'))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('export', 'import'))
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--retry-failed-task', type=int, help='Explicitly requeue this journaled no-space document task after fixing storage')
    parser.add_argument('--key-stdin', action='store_true', help='Read the key from a private stdin pipe instead of the terminal prompt')
    args = parser.parse_args()
    try:
        endpoint = 'http://127.0.0.1:' + ('7700' if args.mode == 'export' else '17700')
        key = read_key(args.key_stdin, 'Master key Meilisearch ' + ('sviluppo' if args.mode == 'export' else 'staging') + ': ')
        client = TransferClient(endpoint, key)
        if args.mode == 'export':
            if args.retry_failed_task is not None:
                raise ValueError('retry-is-import-only')
            export(client, args.directory.resolve())
        else:
            import_bundle(client, args.directory.resolve(), args.retry_failed_task)
    except Exception as error:
        # Never print HTTP bodies, documents, credentials or request headers.
        emit(**failure_details(error))
        sys.exit(1)
