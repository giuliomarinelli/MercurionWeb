"""Read-only service inventory before preview cold recovery; never reads secret bodies."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess

BASE = Path('/opt/mercurion/releases')
EXPECTED = {'meilisearch': 'mercurion-shared', 'postgres-preview': 'mercurion-preview',
            'redis-preview': 'mercurion-preview', 'nats-preview': 'mercurion-preview'}


# Filter on the Docker daemon: Config.Env and arbitrary labels never enter this process.
LABELS = ('com.docker.compose.service', 'com.docker.compose.project', 'com.docker.compose.volume', 'mercurion.bootstrap.run')
LABEL_FORMAT = '{' + ','.join(json.dumps(key) + ':{{json (index .Labels ' + json.dumps(key) + ')}}' for key in LABELS) + '}'
CONTAINER_FORMAT = ('{"Id":{{json .Id}},"Image":{{json .Image}},"Config":{"Labels":' + LABEL_FORMAT.replace('.Labels ', '.Config.Labels ')
    + '},"State":{"Status":{{json .State.Status}},"Running":{{json .State.Running}}},'
    + '"HostConfig":{"PortBindings":{{json .HostConfig.PortBindings}},"Privileged":{{json .HostConfig.Privileged}},'
    + '"ReadonlyRootfs":{{json .HostConfig.ReadonlyRootfs}}},"Mounts":{{json .Mounts}},'
    + '"NetworkSettings":{"Networks":{{json .NetworkSettings.Networks}}}}')
VOLUME_FORMAT = '{"Name":{{json .Name}},"Driver":{{json .Driver}},"Labels":' + LABEL_FORMAT + '}'


def regular(path):
    for parent in (path.parent, *path.parent.parents):
        info = parent.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise ValueError('untrusted-report-parent')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022 or info.st_size > 1048576:
            raise ValueError('untrusted-report-file')
        return stream.read(1048577)


def docker(*args):
    # Fixed local socket; inherited contexts cannot redirect inspection elsewhere.
    environment = {k: v for k, v in os.environ.items() if not k.startswith(('DOCKER_', 'COMPOSE_'))}
    result = subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args],
                            env=environment, capture_output=True, text=True, timeout=30)
    if result.returncode:
        raise ValueError('docker-read-failed')
    return result.stdout


def summarize(containers, identifier, owned):
    if not isinstance(containers, list) or len(containers) != 4:
        raise ValueError('expected-four-original-containers')
    result = []
    seen = set()
    for item in containers:
        labels = item.get('Config', {}).get('Labels') or {}
        service = labels.get('com.docker.compose.service')
        if (service not in EXPECTED or service in seen or item.get('Id') not in owned
                or labels.get('com.docker.compose.project') != EXPECTED[service]
                or labels.get('mercurion.bootstrap.run') != identifier):
            raise ValueError('container-identity-mismatch')
        seen.add(service)
        host = item.get('HostConfig', {})
        if host.get('PortBindings') or host.get('Privileged') or host.get('ReadonlyRootfs') is not True:
            raise ValueError('unexpected-runtime-contract')
        mounts = [{key: m.get(key) for key in ('Type', 'Name', 'Source', 'Destination', 'RW')}
                  for m in item.get('Mounts', [])]
        state = item.get('State', {})
        result.append(dict(service=service, id=item['Id'], image=item['Image'],
            status=state.get('Status'), running=state.get('Running'),
            mounts=mounts, networks={name: {key: value.get(key) for key in ('IPAddress', 'GlobalIPv6Address')}
                                   for name, value in item.get('NetworkSettings', {}).get('Networks', {}).items()}))
    return sorted(result, key=lambda item: item['service'])


def inventory(identifier, digest):
    root = BASE / ('server-' + identifier)
    raw = regular(root / 'server-bootstrap.json')
    if hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError('release-manifest-mismatch')
    manifest = json.loads(raw)
    previous = json.loads(regular(root / 'bootstrap-result.json'))
    owned = previous.get('ownedContainers', [])
    if (manifest.get('runId') != identifier or previous.get('runId') != identifier
            or previous.get('status') != 'passed' or len(set(owned)) != 4
            or not all(re.fullmatch('[a-f0-9]{64}', value) for value in owned)):
        raise ValueError('original-successful-bootstrap-required')
    ids = docker('ps', '-aq', '--no-trunc', '--filter', 'label=mercurion.bootstrap.run=' + identifier).split()
    if set(ids) != set(owned):
        raise ValueError('original-container-set-changed')
    containers = summarize([json.loads(line) for line in docker('inspect', '--format', CONTAINER_FORMAT, *owned).splitlines()], identifier, owned)
    volumes = sorted({m['Name'] for item in containers for m in item['mounts'] if m['Type'] == 'volume'})
    if len(volumes) != 3 or not all(isinstance(name, str) and re.fullmatch('[A-Za-z0-9_.-]+', name) for name in volumes):
        raise ValueError('unexpected-persistent-volumes')
    volume_info = [json.loads(line) for line in docker('volume', 'inspect', '--format', VOLUME_FORMAT, *volumes).splitlines()]
    sanitized = [dict(name=item['Name'], driver=item.get('Driver'), labels={key: (item.get('Labels') or {}).get(key)
                     for key in ('com.docker.compose.project', 'com.docker.compose.volume', 'mercurion.bootstrap.run')})
                 for item in volume_info]
    secret_root = Path('/run/mercurion-preview') / identifier
    # lstat only: credentials are never opened, hashed or printed.
    exists = os.path.lexists(secret_root)
    metadata = None
    if exists:
        info = secret_root.lstat()
        metadata = dict(directory=stat.S_ISDIR(info.st_mode), symlink=stat.S_ISLNK(info.st_mode),
                        uid=info.st_uid, mode=oct(stat.S_IMODE(info.st_mode)))
    mountinfo = Path('/proc/self/mountinfo').read_text()
    tmpfs = any(line.split()[4] == '/run' and line.split(' - ', 1)[1].split()[0] == 'tmpfs'
                for line in mountinfo.splitlines())
    return dict(containers=containers, volumes=sanitized, secretRunPresent=exists,
        secretRunMetadata=metadata, runIsTmpfs=tmpfs,
        bootId=Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
        coldRecoveryCandidate=tmpfs and not exists and all(item['status'] in ('exited', 'created')
                                                        and item['running'] is False for item in containers))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--inspection-id', required=True)
    args = parser.parse_args()
    if (os.geteuid() != 0 or not re.fullmatch('[a-f0-9]{32}', args.run_id)
            or not re.fullmatch('[a-f0-9]{32}', args.inspection_id)
            or not re.fullmatch('[a-f0-9]{64}', args.manifest_sha256)):
        raise SystemExit('Invalid inventory scope or identity')
    root = BASE / ('server-' + args.run_id)
    for parent in (root, *root.parents):
        info = parent.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise SystemExit('Untrusted release directory; no report written')
    report = dict(schemaVersion=1, runId=args.run_id, inspectionId=args.inspection_id,
        observedAtUtc=datetime.now(timezone.utc).isoformat(), status='failed',
        servicesStarted=False, credentialsRead=False, isolationAccepted=False)
    try:
        report.update(inventory(args.run_id, args.manifest_sha256), status='inventoried')
    except (ValueError, OSError, KeyError, TypeError, subprocess.TimeoutExpired) as error:
        report['errorType'] = type(error).__name__
        # Fixed contract codes only; never serialize Docker stderr/configuration.
        if isinstance(error, ValueError) and re.fullmatch('[a-z-]+', str(error)):
            report['code'] = str(error)
    path = BASE / ('server-' + args.run_id) / ('recovery-inventory-' + args.inspection_id + '.json')
    with path.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
    path.chmod(0o644)
    print(json.dumps({key: report[key] for key in ('runId', 'inspectionId', 'status', 'servicesStarted', 'credentialsRead')}))
    return 0 if report['status'] == 'inventoried' else 1


if __name__ == '__main__':
    raise SystemExit(main())
