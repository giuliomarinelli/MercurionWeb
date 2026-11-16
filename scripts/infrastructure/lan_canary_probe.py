"""Controlled IPv4 guest/two-bridge to Android TCP canary; no policy changes."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import ipaddress
import json
import os
from pathlib import Path
import re
import socketserver
import threading
import time

from network_canary import now, probe
from probe_container_isolation import IMAGE, LABEL, docker, run_case


def stamp(value):
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        raise ValueError('Timezone required')
    return result


def validate(config, active=True):
    for key in ('runId', 'nonce'):
        if not re.fullmatch('[a-f0-9]{32}', config[key]):
            raise ValueError('Invalid public run marker')
    address = ipaddress.ip_address(config['address'])
    if not any(address in ipaddress.ip_network(prefix)
               for prefix in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')):
        raise ValueError('Explicit RFC1918 phone IPv4 required')
    if type(config['port']) is not int or not 1024 <= config['port'] <= 65535:
        raise ValueError('Unprivileged TCP port required')
    start, end = stamp(config['readyAtUtc']), stamp(config['expiresAtUtc'])
    # The pinned Android server samples ready/expires separately (microsecond drift).
    if not 0 < (end-start).total_seconds() < 601:
        raise ValueError('Bounded phone window required')
    if active and not start <= datetime.now(timezone.utc) < end:
        raise ValueError('Phone window not active')


def save(path, value, owner=None):
    temporary = path.with_suffix('.json.tmp')
    with temporary.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')
    temporary.chmod(0o600)
    if owner is not None:
        os.chown(temporary, *owner)
    temporary.replace(path)


@contextmanager
def guest_control(nonce):
    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            self.request.settimeout(1)
            self.request.sendall(f'INF_VM_02 {nonce}\n'.encode('ascii'))

    with socketserver.TCPServer(('127.0.0.1', 0), Handler) as server:
        worker = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .1}, daemon=True)
        worker.start()
        try:
            yield server.server_address[1]
        finally:
            server.shutdown()
            worker.join(timeout=3)
            if worker.is_alive():
                raise RuntimeError('Control thread did not stop')


def guest_case(config, client=probe):
    case = dict(network='guest', status='invalid', cleanupErrors=[])
    with guest_control(config['nonce']) as port:
        before = client('127.0.0.1', port, config['nonce'])
        case['controlBefore'] = before
        if before['outcome'] != 'reachable':
            raise RuntimeError('Guest positive control failed')
        validate(config)
        case['hostProbe'] = client(config['address'], config['port'], config['nonce'], require_route=True)
        case['controlAfter'] = client('127.0.0.1', port, config['nonce'])
        if case['controlAfter']['outcome'] != 'reachable':
            raise RuntimeError('Guest final control failed')
        if case['hostProbe']['outcome'] == 'not-reachable' and case['hostProbe'].get('route'):
            case['status'] = 'observed-path-not-reachable'
    return case


def run_guest(config, root, invoke=docker):
    report = dict(schemaVersion=1, runId=config['runId'], nonce=config['nonce'],
                  address=config['address'], port=config['port'], startedAtUtc=now(),
                  scope='LAN IPv4 guest/two-bridge to controlled Android TCP only',
                  cases=[], cleanupErrors=[], status='invalid', isolationAccepted=False)
    network_id = None
    try:
        validate(config)
        platform = invoke('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}')
        metadata = json.loads(invoke('image', 'inspect', IMAGE))[0]
        if platform != 'linux/amd64' or (metadata['Id'], metadata['Os'], metadata['Architecture']) != (IMAGE, 'linux', 'amd64'):
            raise RuntimeError('Verified local image/platform required')
        report.update(imageId=IMAGE, dockerPlatform=platform)
        report['cases'].append(guest_case(config))
        if report['cases'][-1]['status'] != 'observed-path-not-reachable':
            raise RuntimeError('Guest path requires review')
        name = 'inf-vm02-lan-'+config['runId']
        network_id = invoke('network', 'create', '--driver', 'bridge', '--label', f'{LABEL}={config["runId"]}', name)
        if not re.fullmatch('[a-f0-9]{64}', network_id):
            network_id = None
            raise RuntimeError('Unexpected network identifier')
        for network in ('bridge', name):
            validate(config)
            case = run_case(config, network, str(root/'network_canary.py'), invoke, require_route=True)
            report['cases'].append(case)
            if case['status'] != 'observed-path-not-reachable':
                raise RuntimeError('Container path requires review')
        report['status'] = 'observed-path-not-reachable'
    except Exception as error:
        report['errorType'] = type(error).__name__
    finally:
        if network_id:
            try:
                invoke('network', 'rm', network_id)
            except Exception as error:
                report['cleanupErrors'].append(dict(id=network_id, errorType=type(error).__name__))
                report['status'] = 'invalid'
        report['finishedAtUtc'] = now()
    return report


def watch(config, root, client=probe):
    report = dict(runId=config['runId'], nonce=config['nonce'], address=config['address'],
                  port=config['port'], controls=[], status='invalid', isolationAccepted=False)
    try:
        validate(config)
        deadline = time.monotonic() + (stamp(config['expiresAtUtc'])-datetime.now(timezone.utc)).total_seconds()

        def check():
            validate(config)
            result = client(config['address'], config['port'], config['nonce'])
            report['controls'].append(result)
            if result['outcome'] != 'reachable':
                raise RuntimeError('Windows to phone positive control failed')

        check()
        save(root/'lan-ready.json', dict(runId=config['runId'], status='positive-control-ready'))
        next_control = time.monotonic()+5
        while time.monotonic() < deadline and not (root/'lan-stop').exists():
            time.sleep(.2)
            if time.monotonic() >= next_control:
                check()
                next_control = time.monotonic()+5
        check()
        report.update(status='controls-passed', stopReason='requested' if (root/'lan-stop').exists() else 'deadline')
    except Exception as error:
        report['errorType'] = type(error).__name__
    finally:
        report.update(finishedAtUtc=now(), finished=True)
        save(root/'lan-control.json', report)
    return report


def correlate(config, host, guest):
    validate(config, active=False)
    for report in (host, guest):
        if any(report[key] != config[key] for key in ('runId', 'nonce', 'address', 'port')):
            raise ValueError('Reports do not identify the same phone run')
    if host['status'] != 'controls-passed' or host.get('stopReason') != 'requested' or not host.get('finished'):
        raise ValueError('Windows controls not completed')
    controls = host['controls']
    if len(controls) < 2 or any(item['outcome'] != 'reachable' for item in controls):
        raise ValueError('Positive Windows controls required')
    if (guest['status'] != 'observed-path-not-reachable' or guest['cleanupErrors'] or
            guest['imageId'] != IMAGE or guest['dockerPlatform'] != 'linux/amd64'):
        raise ValueError('Invalid guest execution or cleanup')
    cases = guest['cases']
    expected = {'guest', 'bridge', 'inf-vm02-lan-'+config['runId']}
    if len(cases) != 3 or {case['network'] for case in cases} != expected:
        raise ValueError('Three distinct origins required')
    for result in controls:
        if any(result[key] != config[key] for key in ('address', 'port', 'nonce')):
            raise ValueError('Wrong control endpoint/marker')
        if not stamp(config['readyAtUtc']) <= stamp(result['observedAtUtc']) <= stamp(result['finishedAtUtc']) <= stamp(config['expiresAtUtc']):
            raise ValueError('Control outside phone window')
    for case in cases:
        attempted, before, after = case['hostProbe'], case['controlBefore'], case['controlAfter']
        start, end = stamp(attempted['observedAtUtc']), stamp(attempted['finishedAtUtc'])
        if (case['status'] != 'observed-path-not-reachable' or case['cleanupErrors'] or
                attempted['outcome'] != 'not-reachable' or not attempted.get('route') or
                any(attempted[key] != config[key] for key in ('address', 'port', 'nonce')) or
                not stamp(config['readyAtUtc']) <= start <= end <= stamp(config['expiresAtUtc'])):
            raise ValueError('Attempt invalid, reachable or outside phone window')
        if (any(item['outcome'] != 'reachable' or item['nonce'] != config['nonce'] for item in (before, after)) or
                (before['address'], before['port']) != (after['address'], after['port']) or
                stamp(before['finishedAtUtc']) > start or stamp(after['observedAtUtc']) < end):
            raise ValueError('Origin controls do not bracket attempt')
        if not (any(stamp(item['finishedAtUtc']) < start for item in controls) and
                any(stamp(item['observedAtUtc']) > end for item in controls)):
            raise ValueError('Windows controls do not bracket attempt')
    return dict(runId=config['runId'], scope=guest['scope'], status='observed-path-not-reachable',
                caseCount=3, hostControlCount=len(controls), isolationAccepted=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('validate', 'guest', 'watch', 'correlate'))
    parser.add_argument('--directory', required=True, type=Path)
    args = parser.parse_args()
    root = args.directory.resolve()
    config = json.loads((root/'config.json').read_text(encoding='utf-8-sig'))
    if args.command == 'validate':
        validate(config)
        print('LAN_CONFIG_OK')
    elif args.command == 'guest':
        if os.geteuid() != 0 or 'ID=ubuntu' not in Path('/etc/os-release').read_text():
            raise RuntimeError('Execute via sudo on the identified Ubuntu guest')
        report = run_guest(config, root)
        save(root/'lan-guest.json', report, owner=(int(os.environ['SUDO_UID']), int(os.environ['SUDO_GID'])))
        print(json.dumps(dict(runId=report['runId'], status=report['status'], caseCount=len(report['cases']), isolationAccepted=False)), flush=True)
        return 0 if report['status'] == 'observed-path-not-reachable' else 2
    elif args.command == 'watch':
        return 0 if watch(config, root)['status'] == 'controls-passed' else 2
    else:
        result = correlate(config, json.loads((root/'lan-control.json').read_text()),
                           json.loads((root/'lan-guest.json').read_text()))
        save(root/'lan-correlation.json', result)
        print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
