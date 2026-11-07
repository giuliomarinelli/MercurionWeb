"""INF-VM-02 H-06: one IPv4 DNS + verified HTTPS HEAD to docs.python.org."""
import argparse
from datetime import datetime, timezone
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import ssl
import subprocess
import sys

HOST = 'docs.python.org'
PATH = '/3/'
IMAGE = 'sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'


def now():
    return datetime.now(timezone.utc).isoformat()


def probe():
    result = dict(startedAtUtc=now(), endpoint=f'https://{HOST}{PATH}', family='IPv4',
                  method='HEAD', status='failed', isolationAccepted=False, stage='dns')
    try:
        addresses = sorted({entry[4][0] for entry in socket.getaddrinfo(HOST, 443, socket.AF_INET, socket.SOCK_STREAM)})
        if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
            raise ValueError('DNS must return public IPv4 addresses only')
        result.update(dnsAddresses=addresses, stage='tls')
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.load_default_certs()
        context.set_alpn_protocols(['http/1.1'])
        # Pin the checked IP, preserving SNI and hostname verification; no proxy or redirect.
        with socket.create_connection((addresses[0], 443), timeout=8) as raw:
            with context.wrap_socket(raw, server_hostname=HOST) as tls:
                result.update(tlsVersion=tls.version(), stage='https')
                connection = http.client.HTTPSConnection(HOST, timeout=8, context=context)
                connection.sock = tls
                try:
                    connection.request('HEAD', PATH, headers={'User-Agent': 'Mercurion-INF-VM-02-H06', 'Connection': 'close'})
                    response = connection.getresponse()
                    result['httpStatus'] = response.status
                    if 200 <= response.status < 400:
                        result['status'] = 'dns-https-reachable'
                    response.close()
                finally:
                    connection.close()
    except Exception as error:
        result['errorType'] = type(error).__name__
    result['finishedAtUtc'] = now()
    return result


def docker(*args, timeout=40):
    environment = {key: value for key, value in os.environ.items() if key not in ('DOCKER_HOST', 'DOCKER_CONTEXT')}
    return subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args], env=environment,
                          check=True, capture_output=True, text=True, timeout=timeout).stdout.strip()


def decode_client(raw):
    result = json.loads(raw)
    if result['endpoint'] != f'https://{HOST}{PATH}' or result['family'] != 'IPv4' or result['method'] != 'HEAD':
        raise ValueError('Unexpected client target')
    return result


def run(root, run_id, invoke=docker):
    report = dict(schemaVersion=1, runId=run_id, startedAtUtc=now(), scope='H-06 IPv4 DNS/HTTPS smoke only',
                  imageId=IMAGE, isolationAccepted=False, cases=[], cleanupErrors=[], status='invalid')
    owned = []
    network_id = None
    try:
        if invoke('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}') != 'linux/amd64':
            raise RuntimeError('Unexpected Docker platform')
        metadata = json.loads(invoke('image', 'inspect', IMAGE))[0]
        if metadata['Id'] != IMAGE or metadata['Os'] != 'linux' or metadata['Architecture'] != 'amd64':
            raise RuntimeError('Verified image missing: no import or pull attempted')
        client_script = root / 'probe_egress.py'
        guest = subprocess.run([sys.executable, '-B', str(client_script), 'client'], capture_output=True,
                               text=True, check=True, timeout=30)
        report['cases'].append(dict(origin='guest', result=decode_client(guest.stdout)))
        network = 'inf-vm02-h06-' + run_id
        network_id = invoke('network', 'create', '--driver', 'bridge', '--label', f'mercurion.inf-vm-02={run_id}', network)
        if not re.fullmatch('[a-f0-9]{64}', network_id):
            network_id = None
            raise RuntimeError('Invalid created network ID')
        for name in ('bridge', network):
            identifier = invoke('create', '--pull', 'never', '--network', name,
                                '--label', f'mercurion.inf-vm-02={run_id}', '--read-only', '--user', '65534:65534',
                                '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true',
                                '--memory', '128m', '--cpus', '0.5', '--pids-limit', '64',
                                '--mount', f'type=bind,source={client_script.as_posix()},target=/probe_egress.py,readonly',
                                '--entrypoint', 'python', IMAGE, '-B', '/probe_egress.py', 'client')
            if not re.fullmatch('[a-f0-9]{64}', identifier):
                raise RuntimeError('Invalid created container ID')
            owned.append(identifier)
            raw = invoke('start', '--attach', identifier, timeout=30)
            if int(invoke('inspect', '--format', '{{.State.ExitCode}}', identifier)):
                raise RuntimeError('Client process failed')
            report['cases'].append(dict(origin=name, result=decode_client(raw)))
        report['status'] = ('dns-https-reachable' if all(case['result']['status'] == 'dns-https-reachable'
                                                       for case in report['cases']) else 'review-required')
    except Exception as error:
        report['errorType'] = type(error).__name__
    finally:
        for identifier in reversed(owned):
            try:
                invoke('rm', '--force', identifier)
            except Exception as error:
                report['cleanupErrors'].append(dict(id=identifier, errorType=type(error).__name__))
        if network_id:
            try:
                invoke('network', 'rm', network_id)
            except Exception as error:
                report['cleanupErrors'].append(dict(id=network_id, errorType=type(error).__name__))
        if report['cleanupErrors']:
            report['status'] = 'invalid'
        report['finishedAtUtc'] = now()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('client', 'run'))
    parser.add_argument('--run-id')
    args = parser.parse_args()
    if args.command == 'client':
        print(json.dumps(probe()), flush=True)
        return 0
    if not args.run_id or not re.fullmatch('[a-f0-9]{32}', args.run_id):
        parser.error('run-id must be 32 lowercase hex characters')
    if 'ID=ubuntu' not in Path('/etc/os-release').read_text():
        parser.error('Run only on the identified Ubuntu guest')
    root = Path(__file__).resolve().parent
    report = run(root, args.run_id)
    (root / 'egress-probe.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('INF_VM_02_H06_RESULT ' + json.dumps(report), flush=True)
    return 0 if report['status'] == 'dns-https-reachable' else 2


if __name__ == '__main__':
    raise SystemExit(main())
