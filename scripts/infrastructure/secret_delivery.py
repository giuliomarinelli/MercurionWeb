"""Linux-only Tox21 pilot; retirement checks Docker mounts read-only, never starts services."""
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
        require(not {'retiring.json', 'retired.json'} & set(os.listdir(run)), 'retired-run')
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


def metadata_file(parent, name, uid, gid, mode):
    meta = os.stat(name, dir_fd=parent, follow_symlinks=False)
    require(stat.S_ISREG(meta.st_mode) and meta.st_nlink == 1 and meta.st_uid == uid
            and meta.st_gid == gid and stat.S_IMODE(meta.st_mode) == mode
            and 0 < meta.st_size <= LIMIT, 'file-permissions')
    return (meta.st_dev, meta.st_ino, meta.st_size, meta.st_uid, meta.st_gid, meta.st_mode)


def run_state(run, environment, owner):
    import pwd
    account = pwd.getpwnam(owner)
    state = decode(read_file(run, 'state.json', 0))  # Metadata only; never bootstrap.json.
    require(isinstance(state, dict) and set(state) == {'schemaVersion', 'environment', 'uid', 'gid'}
            and type(state['schemaVersion']) is int and state['schemaVersion'] == 1
            and state['environment'] == environment and environment in ('preview', 'production')
            and type(state['uid']) is int and state['uid'] == account.pw_uid > 0
            and type(state['gid']) is int and state['gid'] == account.pw_gid > 0, 'state')
    return state


def reconcile_open(identifier, run, environment, owner):
    state = run_state(run, environment, owner)
    names = set(os.listdir(run))
    require(not names - {'state.json', 'inbox', 'applying', 'active', 'retiring.json', 'retired.json'}, 'run-shape')
    if 'retiring.json' in names or 'applying' in names:
        return 'interrupted'
    if 'retired.json' in names:
        require(names == {'state.json', 'retired.json'}, 'run-shape')
        marker = decode(read_file(run, 'retired.json', 0))
        require(isinstance(marker, dict) and type(marker.get('schemaVersion')) is int
                and marker == dict(schemaVersion=1, runId=identifier, environment=environment,
                               consumer='tox21', phase='retired'), 'retired-marker')
        return 'retired'
    if 'active' in names:
        require(names == {'state.json', 'inbox', 'active'}, 'run-shape')
        with directory(BASE / identifier / 'active', 0, 0o511) as active, \
                directory(BASE / identifier / 'inbox', 0, 0o500) as inbox:
            require(set(os.listdir(active)) == {'bootstrap.json'} and not os.listdir(inbox), 'run-shape')
            metadata_file(active, 'bootstrap.json', 10021, 10021, 0o400)
        return 'active'
    require(names == {'state.json', 'inbox'}, 'run-shape')
    with directory(BASE / identifier / 'inbox', state['uid'], 0o700) as inbox:
        contents = set(os.listdir(inbox))
        require(contents in (set(), {'payload.json'}), 'run-shape')
        if contents:
            metadata_file(inbox, 'payload.json', state['uid'], state['gid'], 0o600)
        return 'received' if contents else 'prepared'


def reconcile(identifier, environment, owner):
    runtime_guard(True)
    run_id(identifier)
    if not os.path.lexists(BASE):
        return 'absent'
    with directory(BASE, 0, 0o711):
        if not os.path.lexists(BASE / identifier):
            return 'absent'
        with directory(BASE / identifier, 0, 0o711) as run:
            return reconcile_open(identifier, run, environment, owner)


def source_overlaps_run(source, identifier):
    if not source.startswith('/'):
        return False
    source_path = Path(source).resolve()
    target = (BASE / run_id(identifier)).resolve()
    return source_path == target or source_path in target.parents or target in source_path.parents


def no_consumer_mounts(identifier, invoke=None):
    import subprocess
    if invoke is None:
        def invoke(*arguments):
            env = {key: value for key, value in os.environ.items() if key not in ('DOCKER_HOST', 'DOCKER_CONTEXT')}
            return subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *arguments],
                                  env=env, capture_output=True, text=True, check=True, timeout=10).stdout.strip()
    try:
        identifiers = invoke('ps', '-a', '--no-trunc', '--format', '{{.ID}}').splitlines()
        template = '{"mounts":{{json .Mounts}},"binds":{{json .HostConfig.Binds}},"specs":{{json .HostConfig.Mounts}}}'
        for container in identifiers:
            require(re.fullmatch('[a-f0-9]{64}', container) is not None, 'container-id')
            mounts = json.loads(invoke('inspect', '--format', template, container))
            require(set(mounts) == {'mounts', 'binds', 'specs'}, 'mount-data')
            for name in ('mounts', 'binds', 'specs'):
                require(mounts[name] is None or isinstance(mounts[name], list), 'mount-data')
            sources = [entry.get('Source', '') for entry in (mounts['mounts'] or []) + (mounts['specs'] or [])]
            sources += [entry.split(':', 1)[0] for entry in mounts['binds'] or []]
            require(all(isinstance(source, str) for source in sources), 'mount-data')
            require(not any(source_overlaps_run(source, identifier) for source in sources), 'consumer-mounted')
    except (OSError, ValueError, KeyError, TypeError, AttributeError, RuntimeError, subprocess.SubprocessError):
        raise DeliveryError('consumer-mount-check') from None


def retire(identifier, environment, owner, check_mounts=no_consumer_mounts):
    import fcntl
    phase = reconcile(identifier, environment, owner)
    if phase in ('absent', 'retired'):
        return phase  # Explicit repeat is metadata-only, never an automatic retry.
    require(phase == 'active', 'run-not-active')
    check_mounts(identifier)  # Includes stopped/created containers; failures stop before any mutation.
    with directory(BASE, 0, 0o711), directory(BASE / identifier, 0, 0o711) as run:
        fcntl.flock(run, fcntl.LOCK_EX | fcntl.LOCK_NB)
        require(reconcile_open(identifier, run, environment, owner) == 'active', 'run-changed')
        with directory(BASE / identifier / 'active', 0, 0o511) as active:
            before = metadata_file(active, 'bootstrap.json', 10021, 10021, 0o400)
            marker = encode(dict(schemaVersion=1, runId=identifier, environment=environment,
                                 consumer='tox21', phase='retired'))
            create_file(run, 'retiring.json', marker)
            require(metadata_file(active, 'bootstrap.json', 10021, 10021, 0o400) == before, 'run-changed')
            os.unlink('bootstrap.json', dir_fd=active)
        os.rmdir('active', dir_fd=run)
        os.rmdir('inbox', dir_fd=run)
        os.rename('retiring.json', 'retired.json', src_dir_fd=run, dst_dir_fd=run)
        require(reconcile_open(identifier, run, environment, owner) == 'retired', 'retirement-readback')
    return 'retired'


def inspect_retired(identifier):
    runtime_guard(False)
    run_id(identifier)
    if not os.path.lexists(BASE):
        return 'absent'
    meta = os.lstat(BASE)
    require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0 and stat.S_IMODE(meta.st_mode) == 0o711, 'directory-permissions')
    if not os.path.lexists(BASE / identifier):
        return 'absent'
    meta = os.lstat(BASE / identifier)
    require(stat.S_ISDIR(meta.st_mode) and meta.st_uid == 0 and stat.S_IMODE(meta.st_mode) == 0o711, 'directory-permissions')
    metadata_file(None, BASE / identifier / 'state.json', 0, 0, 0o600)
    metadata_file(None, BASE / identifier / 'retired.json', 0, 0, 0o600)
    require(not any(os.path.lexists(BASE / identifier / name) for name in ('active', 'inbox', 'applying', 'retiring.json')), 'retirement-readback')
    return 'retired'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for command in ('prepare', 'receive', 'apply', 'inspect', 'reconcile', 'retire', 'inspect-retired'):
        sub = commands.add_parser(command)
        sub.add_argument('--run-id', required=True)
        if command in ('prepare', 'reconcile', 'retire'):
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
        elif args.command == 'inspect':
            result = inspect_active(args.run_id)
        elif args.command == 'inspect-retired':
            result = {**receipt(args.run_id, 'retirement-verified'), 'state': inspect_retired(args.run_id)}
        elif args.command == 'reconcile':
            result = {**receipt(args.run_id, 'reconciled'), 'state': reconcile(args.run_id, args.environment, args.owner)}
        else:
            result = {**receipt(args.run_id, 'retired'), 'state': retire(args.run_id, args.environment, args.owner)}
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, KeyError):
        # Do not expose exceptions, filesystem paths, payloads or command arguments.
        print(json.dumps(dict(code='SECRET_DELIVERY_REJECTED')), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
