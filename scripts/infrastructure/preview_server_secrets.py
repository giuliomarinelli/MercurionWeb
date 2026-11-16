"""Preview server-only tmpfs receiver. Values never appear in diagnostics or receipts."""
import argparse
import json
import os
from pathlib import Path
import re
import stat
import sys
import tomllib

import secret_delivery as support

BASE = Path('/run/mercurion-preview')
ROLES = {'postgres': (70, 70, {'admin-password', 'application-password'}),
         'redis': (999, 1000, {'server.conf'}), 'nats': (10021, 10021, {'server.json'}),
         'meilisearch': (10001, 10001, {'server.toml'})}
REDIS_PREFIX = 'bind 0.0.0.0\nprotected-mode yes\ndir /data\nappendonly yes\nnotify-keyspace-events Exg\nrequirepass '
require = support.require


def validate(data, identifier):
    doc = support.decode(data)
    require(isinstance(doc, dict) and set(doc) == {'schemaVersion', 'runId', 'environment', 'consumer', 'documents'}, 'document')
    require(type(doc['schemaVersion']) is int and doc['schemaVersion'] == 1
            and doc['runId'] == support.run_id(identifier) and doc['environment'] == 'preview'
            and doc['consumer'] == 'preview-servers', 'scope')
    documents = doc['documents']
    require(isinstance(documents, dict) and set(documents) == set(ROLES), 'roles')
    for role, (_, _, names) in ROLES.items():
        files = documents[role]
        require(isinstance(files, dict) and set(files) == names, 'files')
        require(all(isinstance(value, str) and 0 < len(value) < 16384 and '\0' not in value
                    for value in files.values()), 'value')
    pg = documents['postgres']
    require(all(re.fullmatch('[A-Za-z0-9+/=]{32,256}', value) for value in pg.values()), 'postgres-format')
    redis = documents['redis']['server.conf']
    require(redis.startswith(REDIS_PREFIX) and redis.endswith('\n'), 'redis-format')
    try:
        password = json.loads(redis[len(REDIS_PREFIX):-1])
        broker = support.decode(documents['nats']['server.json'].encode())
        meili = tomllib.loads(documents['meilisearch']['server.toml'])
    except (ValueError, TypeError):
        raise support.DeliveryError('server-format') from None
    require(isinstance(password, str) and re.fullmatch('[A-Za-z0-9+/=]{32,256}', password)
            and redis == REDIS_PREFIX + json.dumps(password) + '\n', 'redis-format')
    require(isinstance(broker, dict) and set(broker) == {'port', 'authorization'} and broker['port'] == 4222
            and isinstance(broker['authorization'], dict) and set(broker['authorization']) == {'users'}, 'broker-format')
    users = broker['authorization']['users']
    require(isinstance(users, list) and len(users) == 2 and all(isinstance(user, dict) and
            set(user) == {'user', 'password'} for user in users), 'broker-users')
    require([user['user'] for user in users] == ['preview-web-node', 'preview-tox21']
            and all(isinstance(user['password'], str) and re.fullmatch('[A-Za-z0-9+/=]{32,256}', user['password']) for user in users)
            and users[0]['password'] != users[1]['password'], 'broker-users')
    expected = dict(env='production', http_addr='0.0.0.0:7700', db_path='/meili_data/data.ms',
                    no_analytics=True, max_indexing_memory='64Mb', max_indexing_threads=1)
    require(isinstance(meili, dict) and set(meili) == {*expected, 'master_key'}
            and all(meili[key] == value for key, value in expected.items()), 'meili-format')
    master = meili['master_key']
    require(isinstance(master, str) and re.fullmatch('[A-Za-z0-9+/=]{32,256}', master), 'meili-master')
    require(master not in (*pg.values(), password, *(user['password'] for user in users)), 'master-isolation')
    return doc


def guard(privileged):
    support.runtime_guard(privileged)
    mounts = Path('/proc/self/mountinfo').read_text().splitlines()
    require(not any(line.split()[4] == str(BASE) or line.split()[4].startswith(str(BASE) + '/') for line in mounts), 'nested-mount')


def receipt(identifier, phase):
    return dict(schemaVersion=1, runId=identifier, consumer='preview-servers', phase=phase,
                servicesStarted=False, isolationAccepted=False)


def prepare(identifier, owner):
    import pwd
    guard(True)
    support.run_id(identifier)
    account = pwd.getpwnam(owner)
    require(account.pw_uid > 0 and account.pw_gid > 0, 'owner')
    try:
        os.mkdir(BASE, 0o711)
        os.chmod(BASE, 0o711)
    except FileExistsError:
        pass
    with support.directory(BASE, 0, 0o711) as parent:
        os.mkdir(identifier, 0o711, dir_fd=parent)
        os.chmod(identifier, 0o711, dir_fd=parent, follow_symlinks=False)
    with support.directory(BASE / identifier, 0, 0o711) as run:
        support.create_file(run, 'state.json', support.encode(dict(schemaVersion=1, environment='preview',
            uid=account.pw_uid, gid=account.pw_gid)))
        os.mkdir('inbox', 0o700, dir_fd=run)
        os.chown('inbox', account.pw_uid, account.pw_gid, dir_fd=run, follow_symlinks=False)
        os.chmod('inbox', 0o700, dir_fd=run, follow_symlinks=False)
    return receipt(identifier, 'prepared')


def receive(identifier, stream):
    guard(False)
    support.run_id(identifier)
    for path in (BASE, BASE / identifier):
        meta = path.lstat()
        require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0 and stat.S_IMODE(meta.st_mode) == 0o711, 'directory-permissions')
    data = stream.read(support.LIMIT + 1)
    validate(data, identifier)
    with support.inbox_lock(BASE / identifier / 'inbox', os.geteuid()) as inbox:
        support.create_file(inbox, 'payload.json', data)
    return receipt(identifier, 'received')


def apply(identifier):
    guard(True)
    support.run_id(identifier)
    with support.directory(BASE, 0, 0o711), support.directory(BASE / identifier, 0, 0o711) as run:
        require(not os.path.lexists(BASE / identifier / 'active'), 'already-active')
        state = support.decode(support.read_file(run, 'state.json', 0))
        require(set(state) == {'schemaVersion', 'environment', 'uid', 'gid'} and state['environment'] == 'preview', 'state')
        os.mkdir('applying', 0o700, dir_fd=run)  # Exclusive reservation; no retry or replacement.
        with support.inbox_lock(BASE / identifier / 'inbox', state['uid']) as inbox:
            doc = validate(support.read_file(inbox, 'payload.json', state['uid']), identifier)
            stage = BASE / identifier / 'applying'
            for role, (uid, gid, _) in ROLES.items():
                os.mkdir(stage / role, 0o700)
                with support.directory(stage / role, 0, 0o700) as directory:
                    for name, value in doc['documents'][role].items():
                        support.create_file(directory, name, value.encode(), uid, gid, 0o400)
                    os.fchmod(directory, 0o511)
            os.chmod(stage, 0o511)
            require(not os.path.lexists(BASE / identifier / 'active'), 'already-active')
            os.rename('applying', 'active', src_dir_fd=run, dst_dir_fd=run)
            os.fchown(inbox, 0, 0)
            os.fchmod(inbox, 0o500)
            os.unlink('payload.json', dir_fd=inbox)
    return inspect(identifier)


def inspect(identifier):
    # Metadata only; the readiness/deployment process does not read credential bodies.
    support.run_id(identifier)
    for path, mode in ((BASE, 0o711), (BASE / identifier, 0o711),
                       (BASE / identifier / 'active', 0o511), (BASE / identifier / 'inbox', 0o500)):
        meta = path.lstat()
        require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0 and stat.S_IMODE(meta.st_mode) == mode, 'directory-permissions')
    for role, (uid, gid, names) in ROLES.items():
        path = BASE / identifier / 'active' / role
        meta = path.lstat()
        require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0 and stat.S_IMODE(meta.st_mode) == 0o511, 'directory-permissions')
        for name in names:
            support.metadata_file(None, path / name, uid, gid, 0o400)
    return receipt(identifier, 'active')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=('prepare', 'receive', 'apply', 'inspect'))
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--owner')
    args = parser.parse_args()
    try:
        if args.phase == 'prepare':
            answer = prepare(args.run_id, args.owner or os.environ['SUDO_USER'])
        elif args.phase == 'receive':
            answer = receive(args.run_id, sys.stdin.buffer)
        elif args.phase == 'apply':
            answer = apply(args.run_id)
        else:
            guard(False)
            answer = inspect(args.run_id)
        print(json.dumps(answer))
    except Exception:
        print(json.dumps(dict(code='PREVIEW_SERVER_SECRETS_REJECTED')), file=sys.stderr)
        raise SystemExit(1)
