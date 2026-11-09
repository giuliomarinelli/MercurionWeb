"""Linux-only, opt-in Tox21 delivery pilot. No SSH, Docker or service operations."""
import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import stat
import sys

BASE = Path('/run/mercurion-bootstrap')
LIMIT = 1024 * 1024
VARIABLES = {'NATS_USERNAME', 'NATS_PASSWORD'}


class DeliveryError(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise DeliveryError(reason)


def run_id(value):
    require(isinstance(value, str) and re.fullmatch('[0-9a-f]{32}', value) is not None, 'run-id')
    return value


def unique(pairs):
    result = {}
    for name, value in pairs:
        require(name not in result, 'document')
        result[name] = value
    return result


def decode(data):
    require(0 < len(data) <= LIMIT, 'size')
    try:
        return json.loads(data.decode('utf-8'), object_pairs_hook=unique,
                          parse_constant=lambda _: reject('document'))
    except (ValueError, RecursionError):
        raise DeliveryError('document') from None


def reject(reason):
    raise DeliveryError(reason)


def validate(data, expected_run):
    doc = decode(data)
    require(isinstance(doc, dict) and set(doc) == {
        'schemaVersion', 'runId', 'environment', 'consumer', 'variables'}, 'document')
    require(type(doc['schemaVersion']) is int and doc['schemaVersion'] == 1, 'version')
    require(run_id(doc['runId']) == run_id(expected_run), 'run-mismatch')
    require(doc['environment'] in ('preview', 'production'), 'environment')
    require(doc['consumer'] == 'tox21', 'consumer')
    require(isinstance(doc['variables'], dict) and set(doc['variables']) == VARIABLES, 'variables')
    for value in doc['variables'].values():
        require(isinstance(value, str) and bool(value.strip()) and '\0' not in value, 'value')
        try:
            value.encode('utf-8')
        except UnicodeError:
            raise DeliveryError('value') from None
    return doc


def encode(doc):
    return json.dumps(doc, ensure_ascii=True, separators=(',', ':')).encode('ascii')


def runtime_guard(privileged):
    require(sys.platform == 'linux', 'linux-required')
    require((os.geteuid() == 0) == privileged, 'identity')
    # Require a real /run tmpfs, not just a directory named /run or a bind of disk storage.
    mounts = Path('/proc/self/mountinfo').read_text(encoding='utf-8').splitlines()
    require(any(line.split()[4] == '/run' and line.split(' - ', 1)[1].split()[0] == 'tmpfs'
                for line in mounts), 'volatile-area')
    require(not any(line.split()[4].startswith(str(BASE) + '/') or line.split()[4] == str(BASE)
                    for line in mounts), 'nested-mount')
    meta = os.lstat('/run')
    require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0 and not meta.st_mode & 0o022, 'run-directory')


@contextmanager
def directory(path, uid, mode):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        require(info.st_uid == uid and stat.S_IMODE(info.st_mode) == mode, 'directory-permissions')
        yield fd
    finally:
        os.close(fd)


def create_file(parent, name, data, uid=0, gid=0, mode=0o600):
    fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent)
    try:
        with os.fdopen(fd, 'wb', closefd=False) as stream:
            stream.write(data)
            stream.flush()
        if os.geteuid() == 0:
            os.fchown(fd, uid, gid)
        os.fchmod(fd, mode)
    finally:
        os.close(fd)


def read_file(parent, name, uid):
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
    try:
        meta = os.fstat(fd)
        require(stat.S_ISREG(meta.st_mode) and meta.st_nlink == 1 and meta.st_uid == uid
                and stat.S_IMODE(meta.st_mode) == 0o600, 'file-permissions')
        require(0 < meta.st_size <= LIMIT, 'size')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read(LIMIT + 1)
        require(0 < len(data) <= LIMIT, 'size')
        return data
    finally:
        os.close(fd)


def prepare(identifier, environment, owner):
    import pwd
    runtime_guard(True)
    run_id(identifier)
    require(environment in ('preview', 'production'), 'environment')
    account = pwd.getpwnam(owner)
    require(account.pw_uid > 0 and account.pw_gid > 0, 'owner')
    try:
        os.mkdir(BASE, 0o711)
        os.chmod(BASE, 0o711)
    except FileExistsError:
        pass
    with directory(BASE, 0, 0o711) as base:
        # EEXIST reserves a run forever in this boot; never reuse or overwrite it.
        os.mkdir(identifier, 0o711, dir_fd=base)
        os.chmod(identifier, 0o711, dir_fd=base, follow_symlinks=False)
        with directory(BASE / identifier, 0, 0o711) as run:
            create_file(run, 'state.json', encode(dict(schemaVersion=1, environment=environment,
                        uid=account.pw_uid, gid=account.pw_gid)))
            os.mkdir('inbox', 0o700, dir_fd=run)
            os.chown('inbox', account.pw_uid, account.pw_gid, dir_fd=run, follow_symlinks=False)
            os.chmod('inbox', 0o700, dir_fd=run, follow_symlinks=False)
    return receipt(identifier, 'prepared')


def receipt(identifier, phase):
    return dict(schemaVersion=1, runId=identifier, consumer='tox21', phase=phase,
                servicesStarted=False, isolationAccepted=False)


@contextmanager
def inbox_lock(path, uid):
    import fcntl
    with directory(path, uid, 0o700) as inbox:
        fcntl.flock(inbox, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield inbox


def receive(identifier, stream):
    runtime_guard(False)
    run_id(identifier)
    # Validate protected ancestors even though the receiver cannot list them.
    for path in (BASE, BASE / identifier):
        meta = os.lstat(path)
        require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0
                and stat.S_IMODE(meta.st_mode) == 0o711, 'directory-permissions')
    data = stream.read(LIMIT + 1)
    validate(data, identifier)
    with inbox_lock(BASE / identifier / 'inbox', os.geteuid()) as inbox:
        create_file(inbox, 'payload.json', data)
    return receipt(identifier, 'received')


def apply(identifier):
    runtime_guard(True)
    run_id(identifier)
    with directory(BASE, 0, 0o711), directory(BASE / identifier, 0, 0o711) as run:
        state = decode(read_file(run, 'state.json', 0))
        require(isinstance(state, dict) and set(state) == {'schemaVersion', 'environment', 'uid', 'gid'}
                and type(state['schemaVersion']) is int and state['schemaVersion'] == 1
                and state['environment'] in ('preview', 'production')
                and type(state['uid']) is int and state['uid'] > 0
                and type(state['gid']) is int and state['gid'] > 0, 'state')
        # A root-owned exclusive reservation prevents concurrent/repeated apply.
        # Any interrupted apply remains reserved for manual diagnosis; no automatic retry.
        os.mkdir('applying', 0o700, dir_fd=run)
        with inbox_lock(BASE / identifier / 'inbox', state['uid']) as inbox:
            doc = validate(read_file(inbox, 'payload.json', state['uid']), identifier)
            require(doc['environment'] == state['environment'], 'environment-mismatch')
            consumer = dict(schemaVersion=1,
                            environment='staging' if doc['environment'] == 'preview' else 'production',
                            variables=doc['variables'])
            material = encode(consumer)
            require(len(material) <= LIMIT, 'consumer-size')
            with directory(BASE / identifier / 'applying', 0, 0o700) as stage:
                create_file(stage, 'bootstrap.json', material, 10021, 10021, 0o400)
                os.fchmod(stage, 0o511)
            # Active is never replaced. All operations on this parent are root-controlled.
            require(not os.path.lexists(BASE / identifier / 'active'), 'already-active')
            os.rename('applying', 'active', src_dir_fd=run, dst_dir_fd=run)
            os.fchown(inbox, 0, 0)
            os.fchmod(inbox, 0o500)
            os.unlink('payload.json', dir_fd=inbox)
        # Retain the empty inbox, state and active directory: the run stays reserved.
    return receipt(identifier, 'applied')


def inspect_active(identifier):
    """Non-root metadata-only confirmation; never open the credential file."""
    runtime_guard(False)
    run_id(identifier)
    for path, uid, mode in ((BASE, 0, 0o711), (BASE / identifier, 0, 0o711),
                            (BASE / identifier / 'active', 0, 0o511),
                            (BASE / identifier / 'inbox', 0, 0o500)):
        meta = os.lstat(path)
        require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == uid
                and stat.S_IMODE(meta.st_mode) == mode, 'directory-permissions')
    meta = os.lstat(BASE / identifier / 'active/bootstrap.json')
    require(stat.S_ISREG(meta.st_mode) and meta.st_nlink == 1 and meta.st_uid == 10021
            and meta.st_gid == 10021 and stat.S_IMODE(meta.st_mode) == 0o400, 'file-permissions')
    return receipt(identifier, 'active')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for command in ('prepare', 'receive', 'apply', 'inspect'):
        sub = commands.add_parser(command)
        sub.add_argument('--run-id', required=True)
        if command == 'prepare':
            sub.add_argument('--environment', required=True, choices=('preview', 'production'))
            sub.add_argument('--owner', required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == 'prepare':
            result = prepare(args.run_id, args.environment, args.owner)
        elif args.command == 'receive':
            result = receive(args.run_id, sys.stdin.buffer)
        elif args.command == 'apply':
            result = apply(args.run_id)
        else:
            result = inspect_active(args.run_id)
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, KeyError):
        # Do not expose exceptions, filesystem paths, payloads or command arguments.
        print(json.dumps(dict(code='SECRET_DELIVERY_REJECTED')), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
