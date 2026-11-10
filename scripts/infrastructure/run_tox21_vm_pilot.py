"""VM-041: verified archive load and an isolated real Tox21/NATS RPC pilot."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import uuid

import guest_artifact_preflight as guest
import prepare_tox21_transport as transport

SCRIPTS = ('scripts/coordinate-delivery.py',
           'scripts/infrastructure/prepare_tox21_transport.py',
           'scripts/infrastructure/guest_artifact_preflight.py',
           'scripts/infrastructure/smoke_tox21_candidate.py',
           'scripts/infrastructure/run_tox21_vm_pilot.py')
BROKER_FILES = ('image.tar', 'vulnerabilities.json', 'sbom.cdx.json')


def broker(directory):
    for name in BROKER_FILES:
        transport.regular(directory / name)
    digest, config = transport.delivery.archive_config(directory / 'image.tar')
    scan = transport.read(directory / 'vulnerabilities.json')
    security = transport.delivery.security_summary(scan, digest)
    sbom = transport.read(directory / 'sbom.cdx.json')
    labels = config.get('config', {}).get('Labels', {})
    if (not security['eligible'] or not any(result.get('Type') == 'gobinary' for result in scan['Results'])
            or config.get('os') != 'linux' or config.get('architecture') != 'amd64'
            or sbom.get('bomFormat') != 'CycloneDX' or not sbom.get('components')
            or labels.get('org.opencontainers.image.revision') != '5a815f11a911efa2c88fd1dbfb18ed89a449bfc1'
            or labels.get('org.mercurion.crypto.revision') != '2f1f834330b2d36ab3db8bfb33aaa1ac16794588'):
        raise ValueError('Broker must have complete zero-finding scan and pinned patched provenance')
    return {'configDigest': digest, 'archiveSha256': transport.delivery.checksum(directory / 'image.tar'),
            'version': labels['org.opencontainers.image.version']}


def ready(report, request):
    expected = {'platform', 'os', 'address', 'gateway', 'ipv4OnlyBaseline', 'docker', 'compose', 'space'}
    if (report.get('request') != request or report.get('readyForArtifactTransfer') is not True
            or report.get('status') != 'ready' or set(report.get('checks', {})) != expected
            or any(value is not True for value in report['checks'].values())):
        raise ValueError('Successful correlated guest preflight required')


def prepare(bundle, preflight, broker_dir, output):
    transport.validate(bundle)
    request = transport.read(bundle / 'preflight/request.json')
    ready(transport.read(preflight), request)
    broker_value = broker(broker_dir)
    output.mkdir(parents=True, exist_ok=False)
    files = [*transport.read(bundle / 'transport.json')['files'], 'transport.json']
    pairs = [(bundle / name, output / 'candidate' / name) for name in files]
    pairs += [(broker_dir / name, output / 'broker' / name) for name in BROKER_FILES]
    pairs += [(transport.ROOT / name, output / name) for name in SCRIPTS]
    pairs += [(preflight, output / 'guest-preflight.json')]
    for source, destination in pairs:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(transport.regular(source), destination)
    manifest = {'schemaVersion': 1, 'scope': 'preview-tox21-isolated-rpc-pilot',
                'runId': uuid.uuid4().hex, 'broker': broker_value,
                'files': {str(destination.relative_to(output)).replace('\\', '/'):
                          transport.delivery.checksum(destination) for _, destination in pairs},
                'publishedPorts': False, 'realCredentials': False, 'isolationAccepted': False}
    transport.write(output / 'pilot.json', manifest)
    return verify(output)


def verify(root):
    manifest = transport.read(root / 'pilot.json')
    candidate = root / 'candidate'
    # Fixed allowlist prevents manifest path traversal before any checksum reads.
    expected = {'candidate/' + name for name in (
        *('components/tox21/' + name for name in transport.FILES),
        'candidate-summary.json', 'coordinated.json', 'transport.json',
        'preflight/request.json', 'preflight/guest_artifact_preflight.py')}
    expected |= {'broker/' + name for name in BROKER_FILES} | set(SCRIPTS) | {'guest-preflight.json'}
    if (manifest.get('schemaVersion') != 1
            or manifest.get('scope') != 'preview-tox21-isolated-rpc-pilot'
            or not re.fullmatch('[a-f0-9]{32}', manifest.get('runId', ''))
            or set(manifest.get('files', {})) != expected):
        raise ValueError('Invalid pilot manifest scope or file allowlist')
    for name, digest in manifest['files'].items():
        if transport.delivery.checksum(transport.regular(root / name)) != digest:
            raise ValueError('Pilot checksum mismatch: ' + name)
    transport.validate(candidate)
    if broker(root / 'broker') != manifest['broker']:
        raise ValueError('Broker identity changed')
    ready(transport.read(root / 'guest-preflight.json'), transport.read(candidate / 'preflight/request.json'))
    return manifest


def docker(*args, timeout=90):
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith('DOCKER_')}
    result = subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args],
                            text=True, capture_output=True, timeout=timeout, env=environment)
    if result.returncode:
        raise RuntimeError('local-docker-operation-failed')
    return result.stdout.strip()


def load_archive(archive, expected_digest, roundtrip, execute=docker):
    # Archives are untagged: no existing tag is moved and no existing image removed.
    output = execute('load', '--input', str(archive), timeout=180)
    identifiers = re.findall(r'Loaded image ID: (sha256:[0-9a-f]{64})', output)
    if len(identifiers) != 1:
        raise ValueError('Ambiguous Docker load identity')
    identifier = identifiers[0]
    execute('save', '--output', str(roundtrip), identifier, timeout=180)
    digest, _ = transport.delivery.archive_config(roundtrip)
    if digest != expected_digest:
        raise ValueError('Loaded image config differs from transported archive')
    return {'imageId': identifier, 'configDigest': digest, 'roundtripVerified': True}


def execute(root, report):
    if report.exists() or report.is_symlink():
        raise ValueError('Report exists; no automatic retry')
    manifest = verify(root)
    request = transport.read(root / 'candidate/preflight/request.json')
    result = {'schemaVersion': 1, 'runId': manifest['runId'], 'status': 'failed',
              'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'phase': 'preflight',
              'loaded': {}, 'realServicesStarted': False, 'syntheticOnly': True,
              'publishedPorts': False, 'isolationAccepted': False}
    try:
        current = guest.inspect(request, root)
        result['preflight'] = current
        if not current['readyForArtifactTransfer']:
            raise ValueError('Guest readiness changed')
        readback = root / 'readback'
        readback.mkdir(exist_ok=False)
        for role, archive, digest in (
            ('tox21', root / 'candidate/components/tox21/image.tar', request['configDigest']),
            ('nats', root / 'broker/image.tar', manifest['broker']['configDigest'])):
            result['phase'] = 'loading-' + role
            print(json.dumps({'phase': result['phase']}), flush=True)
            result['loaded'][role] = load_archive(archive, digest, readback / (role + '.tar'))
        component = transport.read(root / 'candidate/components/tox21/component.json')
        result['phase'] = 'rpc-lifecycle'
        print(json.dumps({'phase': result['phase']}), flush=True)
        smoke_report = root / 'rpc-lifecycle.json'
        command = [sys.executable, '-B', str(root / 'scripts/infrastructure/smoke_tox21_candidate.py'),
                   '--local-unix', '--image', result['loaded']['tox21']['imageId'],
                   '--broker-image', result['loaded']['nats']['imageId'],
                   '--revision', component['revision'], '--version', component['version'],
                   '--report', str(smoke_report)]
        # Child owns bounded Docker/readiness calls and its finally cleanup.
        # Do not kill it from the parent before that selective cleanup runs.
        outcome = subprocess.run(command, text=True, capture_output=True)
        smoke = transport.read(smoke_report)
        result['realServicesStarted'] = smoke.get('realServicesStarted', False)
        result['rpc'] = smoke
        if (outcome.returncode or smoke.get('status') != 'passed' or len(smoke.get('checks', [])) != 3
                or smoke.get('cleanupErrors') or smoke.get('gracefulStops') != 3):
            raise ValueError('RPC lifecycle or selective cleanup failed')
        result.update(status='passed', phase='finished', realServicesStarted=True)
    except Exception as error:
        result['errorType'] = type(error).__name__
    finally:
        fd = os.open(report, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o444)
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    create = commands.add_parser('prepare')
    for name in ('bundle', 'preflight', 'broker', 'output'):
        create.add_argument('--' + name, type=Path, required=True)
    check = commands.add_parser('verify')
    check.add_argument('--root', type=Path, required=True)
    run = commands.add_parser('execute')
    run.add_argument('--root', type=Path, required=True)
    run.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'prepare':
        value = prepare(args.bundle, args.preflight, args.broker, args.output)
        print(json.dumps({'status': 'pilot-prepared', 'runId': value['runId'], 'root': str(args.output)}))
    elif args.command == 'verify':
        value = verify(args.root)
        print(json.dumps({'status': 'pilot-verified', 'runId': value['runId']}))
    else:
        value = execute(args.root, args.report)
        print(json.dumps({key: value[key] for key in ('runId', 'status', 'phase', 'realServicesStarted', 'isolationAccepted')}))
        raise SystemExit(0 if value['status'] == 'passed' else 1)
