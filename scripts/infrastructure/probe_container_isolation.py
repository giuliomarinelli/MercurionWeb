"""INF-VM-02 H-04: bounded Docker probe; no published ports or remote daemon."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import time

from network_canary import target

IMAGE = 'sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
LABEL = 'mercurion.inf-vm-02'


def now():
    return datetime.now(timezone.utc).isoformat()


def docker(*args, timeout=30):
    environment = {k: v for k, v in os.environ.items() if k not in ('DOCKER_HOST', 'DOCKER_CONTEXT')}
    return subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args],
                          env=environment, check=True, capture_output=True, text=True, timeout=timeout).stdout.strip()


def validate(config):
    if not re.fullmatch('[a-f0-9]{32}', config['runId']):
        raise ValueError('Invalid run identifier')
    if not re.fullmatch('[a-f0-9]{32}', config['nonce']):
        raise ValueError('Invalid canary marker')
    if not re.fullmatch('[a-f0-9]{64}', config['archiveSha256']):
        raise ValueError('Invalid archive hash')
    family, _ = target(config['address'], config['port'])
    if family != socket.AF_INET:
        raise ValueError('This case covers IPv4 only')
    if datetime.fromisoformat(config['expiresAtUtc']) <= datetime.now(timezone.utc):
        raise ValueError('Expired host canary')


def run_case(config, network, source, invoke=docker, require_route=False):
    """Use the same client configuration for positive and negative attempts."""
    owned = []
    cleanup_errors = []
    case = dict(network=network, startedAtUtc=now(), isolationAccepted=False, status='invalid')
    common = ['--pull', 'never', '--network', network, '--label', f'{LABEL}={config["runId"]}',
              '--read-only', '--user', '65534:65534', '--cap-drop', 'ALL',
              '--security-opt', 'no-new-privileges=true', '--memory', '128m',
              '--cpus', '0.5', '--pids-limit', '64',
              '--mount', f'type=bind,source={source},target=/probe.py,readonly']

    def create(*command):
        identifier = invoke('create', *common, *command)
        if not re.fullmatch('[a-f0-9]{64}', identifier):
            raise RuntimeError('Docker did not return a container ID')
        owned.append(identifier)
        return identifier

    def client(address):
        identifier = create('--entrypoint', 'python', IMAGE, '-B', '/probe.py', 'probe',
                            '--host', address, '--port', str(port), '--nonce', config['nonce'],
                            *(['--require-route'] if require_route else []))
        result = json.loads(invoke('start', '--attach', identifier, timeout=20))
        code = int(invoke('inspect', '--format', '{{.State.ExitCode}}', identifier))
        if code or result['nonce'] != config['nonce'] or result['address'] != address or result['port'] != port:
            raise RuntimeError('Invalid client execution or mismatched result')
        if require_route and not result.get('route'):
            raise RuntimeError('Client namespace route evidence missing')
        return result

    try:
        server_code = f'''import socket
s = socket.socket()
s.bind(("0.0.0.0", 0))
s.listen()
s.settimeout(45)
print(s.getsockname()[1], flush=True)
while True:
    c, a = s.accept()
    with c:
        c.settimeout(1)
        c.sendall(b"INF_VM_02 {config['nonce']}\\n")
'''
        server = create('--entrypoint', 'python', IMAGE, '-u', '-c', server_code)
        invoke('start', server)
        address = invoke('inspect', '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', server)
        deadline = time.monotonic() + 10
        while True:
            logs = invoke('logs', server)
            if logs:
                port = int(logs.strip())
                break
            if time.monotonic() >= deadline:
                raise RuntimeError('Control server did not become ready')
            time.sleep(.2)
        target(address, port)
        before = client(address)
        case['controlBefore'] = before
        if before['outcome'] != 'reachable':
            raise RuntimeError('Container positive control failed before target attempt')
        port = config['port']
        case['hostProbe'] = client(config['address'])
        case['hostProbeCompletedAtUtc'] = now()
        port = before['port']
        after = client(address)
        case['controlAfter'] = after
        if after['outcome'] != 'reachable':
            raise RuntimeError('Container positive control failed after target attempt')
        case['status'] = ('observed-path-not-reachable' if case['hostProbe']['outcome'] == 'not-reachable'
                          else 'target-reachable')
    except Exception as error:
        case['errorType'] = type(error).__name__
    finally:
        for identifier in reversed(owned):
            try:
                invoke('rm', '--force', identifier)
            except Exception as error:
                cleanup_errors.append(dict(id=identifier, errorType=type(error).__name__))
        case.update(finishedAtUtc=now(), cleanupErrors=cleanup_errors)
        if cleanup_errors:
            case['status'] = 'invalid'
    return case


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    args = parser.parse_args()
    root = args.directory.resolve()
    config = json.loads((root / 'config.json').read_text(encoding='utf-8-sig'))
    validate(config)
    report = dict(schemaVersion=1, runId=config['runId'], startedAtUtc=now(),
                  scope='H-04 IPv4 container-to-Windows-host only', isolationAccepted=False,
                  cases=[], status='invalid', cleanupErrors=[])
    network_id = None
    try:
        if not Path('/etc/os-release').is_file() or 'ID=ubuntu' not in Path('/etc/os-release').read_text():
            raise RuntimeError('Execute on the identified Ubuntu guest')
        platform = docker('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}')
        if platform != 'linux/amd64':
            raise RuntimeError('Unexpected guest Docker platform')
        archive = root / 'python-image.tar'
        with archive.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if digest != config['archiveSha256']:
            raise RuntimeError('Image archive hash mismatch')
        # Explicit local import only; no registry pull and no default-context fallback.
        docker('load', '--input', str(archive), timeout=120)
        metadata = json.loads(docker('image', 'inspect', IMAGE))[0]
        if metadata['Id'] != IMAGE or metadata['Os'] != 'linux' or metadata['Architecture'] != 'amd64':
            raise RuntimeError('Unexpected imported image identity')
        report.update(imageId=IMAGE, archiveSha256=digest, dockerPlatform=platform)
        validate(config)
        name = 'inf-vm02-h04-' + config['runId']
        network_id = docker('network', 'create', '--driver', 'bridge', '--label', f'{LABEL}={config["runId"]}', name)
        if not re.fullmatch('[a-f0-9]{64}', network_id):
            network_id = None
            raise RuntimeError('Unexpected network identifier')
        source = str(root / 'network_canary.py')
        for network in ('bridge', name):
            validate(config)
            case = run_case(config, network, source)
            report['cases'].append(case)
            if case['status'] != 'observed-path-not-reachable':
                break
        report['status'] = ('observed-path-not-reachable' if len(report['cases']) == 2 and
                            all(c['status'] == 'observed-path-not-reachable' for c in report['cases'])
                            else 'review-required')
    except Exception as error:
        report['errorType'] = type(error).__name__
    finally:
        if network_id:
            try:
                docker('network', 'rm', network_id)
            except Exception as error:
                report['cleanupErrors'].append(dict(id=network_id, errorType=type(error).__name__))
                report['status'] = 'invalid'
        report['finishedAtUtc'] = now()
        (root / 'container-probe.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        print('INF_VM_02_H04_RESULT ' + json.dumps(report), flush=True)
    return 0 if report['status'] == 'observed-path-not-reachable' else 2


if __name__ == '__main__':
    raise SystemExit(main())
