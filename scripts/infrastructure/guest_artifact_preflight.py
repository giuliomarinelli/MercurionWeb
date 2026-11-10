"""Read-only guest readiness for a later Tox21 archive transfer. No image load."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess


def run(argv):
    # Explicit local Unix socket; never inherit a remote Docker endpoint/context.
    environment = {key: value for key, value in os.environ.items()
                   if key not in ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_CONFIG',
                                  'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH')}
    return subprocess.check_output(argv, text=True, timeout=20, env=environment,
                                   stderr=subprocess.DEVNULL)


def validate_request(request, helper_digest):
    keys = {'schemaVersion', 'runId', 'environment', 'component', 'revision',
            'configDigest', 'archiveSha256', 'archiveBytes', 'runtimeBytes', 'helperSha256'}
    if (set(request) != keys or request['schemaVersion'] != 1
            or request['environment'] != 'preview' or request['component'] != 'tox21'
            or not re.fullmatch('[0-9a-f]{32}', request['runId'])
            or not re.fullmatch('[0-9a-f]{40}', request['revision'])
            or not re.fullmatch('sha256:[0-9a-f]{64}', request['configDigest'])
            or not re.fullmatch('[0-9a-f]{64}', request['archiveSha256'])
            or request['helperSha256'] != helper_digest
            or any(type(request[key]) is not int or request[key] <= 0
                   for key in ('archiveBytes', 'runtimeBytes'))):
        raise ValueError('Invalid preflight request or helper checksum')


def inspect(request, staging, execute=run, disk_usage=shutil.disk_usage,
            machine=None, os_release=None):
    checks = {}
    checks['platform'] = (machine or platform.machine()) in ('x86_64', 'amd64')
    release = os_release if os_release is not None else platform.freedesktop_os_release()
    checks['os'] = release.get('ID') == 'ubuntu' and release.get('VERSION_ID') == '26.04'
    addresses = json.loads(execute(['ip', '-j', 'address', 'show', 'dev', 'eth0']))
    info = [entry for interface in addresses for entry in interface.get('addr_info', [])]
    checks['address'] = any(entry.get('family') == 'inet' and entry.get('local') == '10.203.240.10'
                            and entry.get('prefixlen') == 24 for entry in info)
    routes = json.loads(execute(['ip', '-j', '-4', 'route', 'show', 'default']))
    checks['gateway'] = (len(routes) == 1 and routes[0].get('gateway') == '10.203.240.1'
                         and routes[0].get('dev') == 'eth0')
    ipv6_routes = json.loads(execute(['ip', '-j', '-6', 'route', 'show', 'default']))
    checks['ipv4OnlyBaseline'] = not ipv6_routes and not any(entry.get('family') == 'inet6' for entry in info)
    docker = ['docker', '--host', 'unix:///var/run/docker.sock']
    server = json.loads(execute(docker + ['info', '--format',
        '{"os":{{json .OSType}},"architecture":{{json .Architecture}},"root":{{json .DockerRootDir}},"version":{{json .ServerVersion}}}']))
    checks['docker'] = server.get('os') == 'linux' and server.get('architecture') in ('x86_64', 'amd64')
    compose = execute(docker + ['compose', 'version', '--short']).strip()
    checks['compose'] = bool(re.fullmatch(r'v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?', compose))
    # Conservative simultaneous staging + Docker import budget. Not a capacity guarantee.
    required = 2 * request['archiveBytes'] + request['runtimeBytes'] + 512 * 1024 * 1024
    free = {'staging': disk_usage(staging).free, 'docker': disk_usage(server['root']).free}
    checks['space'] = all(amount >= required for amount in free.values())
    return {'checks': checks, 'requiredFreeBytes': required, 'freeBytes': free,
            'dockerVersion': server['version'], 'composeVersion': compose,
            'readyForArtifactTransfer': all(checks.values())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists() or args.output.is_symlink():
        raise ValueError('Report already exists; do not overwrite or retry')
    request = json.loads(args.request.read_text(encoding='utf-8'))
    validate_request(request, hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    result = {'schemaVersion': 1, 'runId': request['runId'], 'request': request,
              'observedAtUtc': datetime.now(timezone.utc).isoformat(),
              'readyForArtifactTransfer': False, 'servicesStarted': False,
              'imageLoaded': False, 'isolationAccepted': False}
    try:
        result.update(inspect(request, args.request.parent))
    except Exception as error:
        # No command output/environment/credentials copied to the report.
        result['errorType'] = type(error).__name__
    result['status'] = 'ready' if result['readyForArtifactTransfer'] else 'blocked'
    fd = os.open(args.output, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o444)
    with os.fdopen(fd, 'w', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2)
        stream.write('\n')
    print(json.dumps({key: result[key] for key in ('runId', 'status', 'readyForArtifactTransfer', 'isolationAccepted')}))
    return 0 if result['readyForArtifactTransfer'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
