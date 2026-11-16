"""Installed root-owned broker. Never execute Python supplied inside a delivery."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys

# Only operator-installed root-owned modules, including under python -I.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import preview_application_rollout as rollout


def identity(arguments):
    if len(arguments) != 2 or not re.fullmatch('[a-f0-9]{32}', arguments[0]) or not re.fullmatch('[a-f0-9]{64}', arguments[1]):
        raise ValueError('invalid-delivery-identity')
    return arguments


def read_owned(directory, parts, owner, maximum):
    """Walk directory FDs: a concurrent symlink/rename cannot escape the opened tree."""
    fd = os.dup(directory)
    try:
        for part in parts[:-1]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = child
        source = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=fd)
        with os.fdopen(source, 'rb') as stream:
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid != owner or info.st_nlink != 1 or info.st_size > maximum:
                raise ValueError('unexpected-staged-file')
            data = stream.read(maximum+1)
            if len(data) > maximum:
                raise ValueError('staged-file-grew-past-limit')
            return data
    finally:
        os.close(fd)


def deploy(run_id, digest):
    import pwd  # Guest-only module; validation tests also run on Windows.
    if os.geteuid() != 0:
        raise ValueError('broker-root-required')
    # This directory and all its modules/configuration must be root-owned and
    # non-writable by the delivery account (installation is a human operation).
    config = json.loads(Path(__file__).with_name('deployment-policy.json').read_text())
    if os.environ.get('SUDO_USER') != config['deployUser']:
        raise ValueError('unexpected-deploy-user')
    owner = pwd.getpwnam(config['deployUser'])
    source = Path(owner.pw_dir)/('preview-rollout-'+run_id)
    directory = os.open(source, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        raw = read_owned(directory, ['rollout.json'], owner.pw_uid, 65536)
        if hashlib.sha256(raw).hexdigest() != digest:
            raise ValueError('manifest-digest')
        manifest = json.loads(raw)
        if manifest['runId'] != run_id:
            raise ValueError('manifest-run-id')
        roles = manifest['roles']
        if not roles or len(roles) != len(set(roles)) or set(roles)-rollout.ROLES.keys():
            raise ValueError('application-roles-only')
        expected = {'profile.json', 'preview_application_rollout.py', 'restore_preview_secrets.py', 'coordinate-delivery.py'}
        expected |= {role+'/'+name for role in roles for name in rollout.EVIDENCE}
        if set(manifest['files']) != expected:
            raise ValueError('unexpected-delivery-files')
        incoming = json.loads(read_owned(directory, ['profile.json'], owner.pw_uid, 65536))
        if incoming != config['profile']:
            raise ValueError('deployment-target-is-fixed-by-root-policy')
        target = Path('/opt/mercurion/releases')/('rollout-'+run_id)
        target.mkdir(mode=0o755)  # Exclusive, never rerun/reset an earlier delivery.
        for name, wanted in manifest['files'].items():
            if not re.fullmatch(r'(web-node/|web-ng/|tox21/)?[A-Za-z0-9_.-]+', name):
                raise ValueError('invalid-delivery-path')
            # Stream archives rather than loading multi-GB images in root memory.
            parts = name.split('/')
            if name.endswith('image.tar'):
                parent = os.open(parts[0], os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=directory)
                try:
                    fd = os.open(parts[1], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent)
                finally:
                    os.close(parent)
                info = os.fstat(fd)
                if not stat.S_ISREG(info.st_mode) or info.st_uid != owner.pw_uid or info.st_nlink != 1 or info.st_size > 4*1024**3:
                    os.close(fd)
                    raise ValueError('invalid-image-file')
                destination = target/name
                destination.parent.mkdir(exist_ok=True)
                actual = hashlib.sha256()
                copied = 0
                with os.fdopen(fd, 'rb') as source_file, destination.open('xb') as output:
                    while block := source_file.read(1024*1024):
                        copied += len(block)
                        if copied > 4*1024**3:
                            raise ValueError('image-grew-past-limit')
                        actual.update(block)
                        output.write(block)
                actual = actual.hexdigest()
            else:
                data = read_owned(directory, parts, owner.pw_uid, 16*1024**2)
                destination = target/name
                destination.parent.mkdir(exist_ok=True)
                with destination.open('xb') as output:
                    output.write(data)
                actual = hashlib.sha256(data).hexdigest()
            if actual != wanted:
                raise ValueError('staged-content-digest-mismatch')
        (target/'rollout.json').write_bytes(raw)
    finally:
        os.close(directory)
    # Imports are from the installed root-owned directory, never target/.
    rollout.guest(target)


if __name__ == '__main__':
    try:
        deploy(*identity(sys.argv[1:]))
    except Exception as error:
        print(json.dumps(dict(status='failed', errorType=type(error).__name__,
                              detail='Preserve the rollout directory; no retry or cleanup.')))
        raise SystemExit(1) from None
