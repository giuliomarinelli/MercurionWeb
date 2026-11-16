"""Preview application file receiver on tmpfs; server master/admin material is never accepted."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import re
import stat
import sys

import secret_delivery as support

BASE = Path('/run/mercurion-applications')
ROLES = {'web-node': (10001, 10001, {'values.json'}), 'tox21': (10021, 10021, {'values.json', 'http-public.pem'})}


def guard(privileged):
    support.runtime_guard(privileged)
    mounts = Path('/proc/self/mountinfo').read_text().splitlines()
    support.require(not any(line.split()[4] == str(BASE) or line.split()[4].startswith(str(BASE) + '/') for line in mounts), 'nested-app-mount')


def validate(data, identifier):
    value = support.decode(data)
    support.require(isinstance(value, dict) and set(value) == {'schemaVersion', 'runId', 'environment', 'consumer', 'documents'}
        and value['schemaVersion'] == 1 and value['runId'] == support.run_id(identifier)
        and value['environment'] == 'preview' and value['consumer'] == 'preview-applications', 'app-scope')
    documents = value['documents']
    support.require(isinstance(documents, dict) and set(documents) == set(ROLES), 'app-roles')
    for role, (_, _, names) in ROLES.items():
        support.require(isinstance(documents[role], dict) and set(documents[role]) == names, 'app-files')
        for text in documents[role].values():
            support.require(isinstance(text, str) and 0 < len(text.encode()) < support.LIMIT and '\0' not in text, 'app-file-body')
        doc = support.decode(documents[role]['values.json'].encode())
        support.require(isinstance(doc, dict) and set(doc) == {'schemaVersion', 'environment', 'variables'} and doc['schemaVersion'] == 1
            and doc['environment'] == 'staging' and isinstance(doc['variables'], dict), 'app-document')
        variables = doc['variables']
        support.require(all(re.fullmatch('[A-Z][A-Z0-9_]*', name) and isinstance(item, str) and '\0' not in item
                            for name, item in variables.items()), 'app-variables')
        forbidden = {'APP_ENV', 'NODE_ENV', 'PY_ENV', 'NODE_OPTIONS', 'LD_PRELOAD', 'PYTHONPATH', 'MERCURION_BOOTSTRAP_FILE',
                     'JWT_LOCAL_KEYS_CONFIG', 'MEILI_MASTER_KEY', 'POSTGRES_PASSWORD', 'DOCKER_HOST'}
        support.require(not (forbidden & set(variables)), 'app-control-variable')
        if role == 'tox21':
            support.require(set(variables) == {'NATS_USERNAME', 'NATS_PASSWORD'}, 'tox21-app-variables')
            support.require(documents[role]['http-public.pem'].startswith('-----BEGIN PUBLIC KEY-----'), 'public-pem')
        else:
            support.require(bool(variables.get('MEILISEARCH_MASTER_KEY')) and bool(variables.get('MEILISEARCH_LOG_KEY'))
                            and variables['MEILISEARCH_MASTER_KEY'] != variables['MEILISEARCH_LOG_KEY'], 'app-meili-keys')
            try:
                peers = json.loads(variables['APP_TRUSTED_PROXY_CIDRS'])
                support.require(len(peers) == 1 and ipaddress.ip_network(peers[0]).version == 4
                                and ipaddress.ip_network(peers[0]).num_addresses == 1, 'edge-peer')
            except (ValueError, KeyError, TypeError):
                raise support.DeliveryError('edge-peer') from None
    return value


def prepare(identifier, owner):
    import pwd
    guard(True)
    support.run_id(identifier)
    account = pwd.getpwnam(owner)
    support.require(account.pw_uid > 0 and account.pw_gid > 0, 'owner')
    try:
        BASE.mkdir(mode=0o711)
        BASE.chmod(0o711)
    except FileExistsError:
        pass
    with support.directory(BASE, 0, 0o711) as parent:
        os.mkdir(identifier, 0o711, dir_fd=parent)
        os.chmod(identifier, 0o711, dir_fd=parent, follow_symlinks=False)
    with support.directory(BASE / identifier, 0, 0o711) as run:
        support.create_file(run, 'state.json', support.encode(dict(uid=account.pw_uid, gid=account.pw_gid)))
        os.mkdir('inbox', 0o700, dir_fd=run)
        os.chown('inbox', account.pw_uid, account.pw_gid, dir_fd=run, follow_symlinks=False)
        os.chmod('inbox', 0o700, dir_fd=run, follow_symlinks=False)


def receive(identifier, stream):
    guard(False)
    support.run_id(identifier)
    for path in (BASE, BASE / identifier):
        info = path.lstat()
        support.require(stat.S_ISDIR(info.st_mode) and info.st_uid == 0 and stat.S_IMODE(info.st_mode) == 0o711, 'app-directory')
    data = stream.read(support.LIMIT + 1)
    validate(data, identifier)
    with support.inbox_lock(BASE / identifier / 'inbox', os.geteuid()) as inbox:
        support.create_file(inbox, 'payload.json', data)
    return dict(runId=identifier, status='received', consumer='preview-applications', servicesStarted=False)


def apply(identifier):
    guard(True)
    support.run_id(identifier)
    with support.directory(BASE, 0, 0o711), support.directory(BASE / identifier, 0, 0o711) as run:
        support.require(not os.path.lexists(BASE / identifier / 'active'), 'app-already-active')
        state = support.decode(support.read_file(run, 'state.json', 0))
        os.mkdir('applying', 0o700, dir_fd=run)
        with support.inbox_lock(BASE / identifier / 'inbox', state['uid']) as inbox:
            doc = validate(support.read_file(inbox, 'payload.json', state['uid']), identifier)
            stage = BASE / identifier / 'applying'
            for role, (uid, gid, _) in ROLES.items():
                (stage / role).mkdir(mode=0o700)
                with support.directory(stage / role, 0, 0o700) as directory:
                    for name, body in doc['documents'][role].items():
                        support.create_file(directory, name, body.encode(), uid, gid, 0o400)
                    os.fchmod(directory, 0o511)
            stage.chmod(0o511)
            os.rename('applying', 'active', src_dir_fd=run, dst_dir_fd=run)
            os.fchown(inbox, 0, 0)
            os.fchmod(inbox, 0o500)
            os.unlink('payload.json', dir_fd=inbox)
    inspect(identifier)


def inspect(identifier):
    support.run_id(identifier)
    for path, mode in ((BASE, 0o711), (BASE / identifier, 0o711), (BASE / identifier / 'active', 0o511),
                       (BASE / identifier / 'inbox', 0o500)):
        with support.directory(path, 0, mode):
            pass
    for role, (uid, gid, names) in ROLES.items():
        with support.directory(BASE / identifier / 'active' / role, 0, 0o511) as directory:
            for name in names:
                support.metadata_file(directory, name, uid, gid, 0o400)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(receive(args.run_id, sys.stdin.buffer)))
    except Exception:
        raise SystemExit('Application document rejected; no values printed')
