"""Prepare a topology plan; runtime mode only probes already-running synthetic fixtures."""
import argparse
from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'deployment/local-vm'
IMAGE = 'python@sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
RUN_LABEL = 'mercurion.topology.run'
LINUX_ENETUNREACH = 101  # Probe errno belongs to the verified Linux daemon, not the Windows runner.


def now():
    return datetime.now(timezone.utc).isoformat()


def docker(*args, timeout=15):
    environment = {key: value for key, value in os.environ.items() if key not in ('DOCKER_HOST', 'DOCKER_CONTEXT')}
    return subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args], env=environment,
                          capture_output=True, text=True, check=True, timeout=timeout).stdout.strip()


def load_matrix(base=BASE):
    matrix = json.loads((base / 'connectivity.json').read_text())
    if matrix['schemaVersion'] != 1 or matrix['fixturePort'] != 18080:
        raise ValueError('Unsupported connectivity plan')
    if len(matrix['allow']) != 15 or len(matrix['deny']) != 18:
        raise ValueError('Incomplete connectivity plan')
    known = {f'{project}/{role}-{project}' for project in ('preview', 'production')
             for role in ('web-ng', 'web-node', 'postgres', 'redis', 'nats', 'tox21')}
    known.update(f'shared/{role}' for role in ('cloudflared', 'nginx-edge', 'meilisearch', 'meilisearch-ui'))
    seen = set()
    covered = set()
    for mode in ('allow', 'deny'):
        for pair in matrix[mode]:
            if len(pair) != 2 or tuple(pair) in seen:
                raise ValueError('Duplicate or contradictory case')
            for ref in pair:
                if ref not in known:
                    raise ValueError('Invalid service reference')
                covered.add(ref)
            seen.add(tuple(pair))
    if covered != known:
        raise ValueError('Incomplete service coverage')
    return matrix


def assess_negative(before, dns, attempts, after):
    # An unavailable target or an unresolved name alone never proves isolation.
    if not all(item.get('outcome') == 'reachable' for item in before + after) or len(before) != 2 or len(after) != 2:
        return 'invalid'
    if dns.get('status') == 'invalid':
        return 'invalid'
    if dns.get('status') != 'not-resolved':
        return 'failed'
    if not attempts:
        return 'invalid'
    if any(item.get('tcpConnected') for item in attempts):
        return 'failed'
    if any(item.get('tcpConnected') is not False for item in attempts):
        return 'invalid'
    if all(item.get('outcome') == 'not-reachable' or (
            item.get('outcome') == 'no-route' and item.get('errno') == LINUX_ENETUNREACH
            and item.get('routeObserved') is True and item.get('route') is None) for item in attempts):
        return 'passed'
    return 'invalid'


class Runner:
    def __init__(self, invoke=docker, base=BASE):
        self.invoke = invoke
        self.base = base
        self.run_id = uuid.uuid4().hex
        self.owned = set()
        self.cleanup_errors = []
        self.nodes = {}

    def discover(self, refs):
        template = ('{"id":{{json .Id}},"image":{{json .Config.Image}},"running":{{json .State.Running}},'
                    '"command":{{json .Config.Cmd}},"entrypoint":{{json .Config.Entrypoint}},'
                    '"networks":{{json .NetworkSettings.Networks}},"ports":{{json .HostConfig.PortBindings}},'
                    '"readonly":{{json .HostConfig.ReadonlyRootfs}},"privileged":{{json .HostConfig.Privileged}},'
                    '"user":{{json .Config.User}},"dnsOptions":{{json .HostConfig.DnsOptions}}}')
        for ref in sorted(refs):
            project, service = ref.split('/')
            identifiers = self.invoke('ps', '--filter', f'label=com.docker.compose.project=mercurion-{project}',
                                      '--filter', f'label=com.docker.compose.service={service}', '--format', '{{.ID}}').splitlines()
            if len(identifiers) != 1:
                raise ValueError('Every matrix role must have exactly one running fixture')
            node = json.loads(self.invoke('inspect', '--format', template, identifiers[0]))
            if (node['image'] != IMAGE or not node['running'] or node['ports'] or node['privileged']
                    or not node['readonly'] or node['user'] != '65534:65534' or node['dnsOptions'] != ['ndots:1']
                    or node['entrypoint'] != ['python']
                    or node['command'] != ['-B', '/fixture/topology_fixture.py', 'serve', '--identity', service]):
                raise ValueError('Refusing a non-fixture or differently configured service')
            ips = sorted({item['IPAddress'] for item in node['networks'].values() if item.get('IPAddress')})
            if not ips or any(not ipaddress.ip_address(ip).is_private for ip in ips):
                raise ValueError('Fixture must have private IPv4 endpoints')
            node.update(identity=service, ips=ips)
            self.nodes[ref] = node

    def remove_client(self, identifier):
        label = self.invoke('inspect', '--format', '{{index .Config.Labels "' + RUN_LABEL + '"}}', identifier)
        if label != self.run_id:
            raise ValueError('Client ownership mismatch; no removal attempted')
        self.invoke('rm', '--force', identifier)
        self.owned.discard(identifier)

    def measure(self, source, host, identity, mode='client'):
        # A temporary client shares only the fixture's networking namespace.
        source_id = self.nodes[source]['id']
        args = ['-B', '/fixture/topology_fixture.py', mode, '--host', host]
        if mode == 'client':
            args += ['--identity', identity]
        identifier = self.invoke('create', '--pull', 'never', '--network', f'container:{source_id}',
                                 '--label', f'{RUN_LABEL}={self.run_id}', '--read-only', '--user', '65534:65534',
                                 '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true', '--memory', '64m',
                                 '--cpus', '0.25', '--pids-limit', '32', '--mount',
                                 f'type=bind,source={(self.base / "fixtures/topology_fixture.py").as_posix()},target=/fixture/topology_fixture.py,readonly',
                                 '--entrypoint', 'python', IMAGE, *args)
        if not re.fullmatch('[a-f0-9]{64}', identifier):
            raise ValueError('Docker did not return a client container ID')
        self.owned.add(identifier)
        try:
            result = json.loads(self.invoke('start', '--attach', identifier, timeout=12))
            if int(self.invoke('inspect', '--format', '{{.State.ExitCode}}', identifier)):
                raise RuntimeError('Probe client failed')
            if result.get('host') != host or (mode == 'client' and result.get('identity') != identity):
                raise ValueError('Probe result does not match the requested endpoint')
            if mode == 'client' and (not isinstance(result.get('tcpConnected'), bool) or result.get('outcome') not in
                                     ('reachable', 'unexpected-service', 'not-reachable', 'no-route', 'dns-unavailable', 'invalid')):
                raise ValueError('Malformed TCP measurement')
            return result
        finally:
            self.remove_client(identifier)

    def controls(self, source, target):
        return [self.measure(ref, '127.0.0.1', self.nodes[ref]['identity']) for ref in (source, target)]

    def case(self, mode, source, target):
        identity = self.nodes[target]['identity']
        result = dict(expectation=mode, source=source, target=target, startedAtUtc=now())
        if mode == 'allow':
            result['probe'] = self.measure(source, identity, identity)
            addresses = result['probe'].get('dns', {}).get('addresses', [])
            result['status'] = ('passed' if result['probe']['outcome'] == 'reachable' and addresses
                                and set(addresses).issubset(self.nodes[target]['ips']) else 'failed')
        else:
            result['before'] = self.controls(source, target)
            if not all(item['outcome'] == 'reachable' for item in result['before']):
                result['status'] = 'invalid'
            else:
                result['dns'] = self.measure(source, identity, identity, 'resolve')
                result['attempts'] = [self.measure(source, ip, identity) for ip in self.nodes[target]['ips']]
                result['after'] = self.controls(source, target)
                result['status'] = assess_negative(result['before'], result['dns'], result['attempts'], result['after'])
                result['observedMechanisms'] = sorted({
                    'namespace-without-route' if item.get('outcome') == 'no-route' else
                    'tcp-not-connected' if item.get('outcome') == 'not-reachable' else
                    'tcp-connected' if item.get('tcpConnected') else 'measurement-invalid'
                    for item in result['attempts']})
        result['finishedAtUtc'] = now()
        return result

    def run(self, matrix, checkpoint=lambda report:None):
        report = dict(schemaVersion=1, runId=self.run_id, startedAtUtc=now(), scope='Synthetic IPv4 TCP/DNS matrix only',
                      isolationAccepted=False, cases=[], cleanupErrors=self.cleanup_errors, status='invalid',
                      matrixSha256=hashlib.sha256((self.base / 'connectivity.json').read_bytes()).hexdigest(),
                      fixtureSha256=hashlib.sha256((self.base / 'fixtures/topology_fixture.py').read_bytes()).hexdigest())
        try:
            checkpoint(report)
            if self.invoke('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}') != 'linux/amd64':
                raise ValueError('Unexpected Docker platform')
            refs = {ref for mode in ('allow', 'deny') for pair in matrix[mode] for ref in pair}
            self.discover(refs)
            report['fixtureIds'] = {ref: node['id'] for ref, node in self.nodes.items()}
            readiness = {ref: self.measure(ref, '127.0.0.1', node['identity']) for ref, node in self.nodes.items()}
            report['readiness'] = readiness
            checkpoint(report)
            if not all(item['outcome'] == 'reachable' for item in readiness.values()):
                raise RuntimeError('Fixture readiness failed')
            deadline = time.monotonic() + 300
            for mode in ('allow', 'deny'):
                for source, target in matrix[mode]:
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Matrix time budget exhausted')
                    report['activeCase'] = dict(expectation=mode, source=source, target=target)
                    checkpoint(report)
                    case = self.case(mode, source, target)
                    report['cases'].append(case)
                    checkpoint(report)
                    if case['status'] != 'passed':
                        report['status'] = case['status']
                        return report
            report['status'] = 'passed'
        except (Exception, KeyboardInterrupt) as error:
            report['errorType'] = type(error).__name__
        finally:
            # Also discover a labelled client whose create call may have timed out.
            try:
                labelled = self.invoke('ps', '-a', '--no-trunc', '--filter', f'label={RUN_LABEL}={self.run_id}', '--format', '{{.ID}}')
                for identifier in labelled.splitlines():
                    if not re.fullmatch('[a-f0-9]{64}', identifier):
                        raise ValueError('Invalid labelled client ID')
                    self.owned.add(identifier)
            except Exception as error:
                self.cleanup_errors.append(dict(scope='client-discovery', errorType=type(error).__name__))
            # Never stop Compose fixtures or prune Docker. Each removal verifies the run label.
            for identifier in list(self.owned):
                try:
                    self.remove_client(identifier)
                except Exception as error:
                    self.cleanup_errors.append(dict(id=identifier, errorType=type(error).__name__))
            if self.cleanup_errors:
                report['status'] = 'invalid'
            report['finishedAtUtc'] = now()
        return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute-existing-fixtures', action='store_true', help='Runtime mode; requires separate operator authorization')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    matrix = load_matrix()
    if not args.execute_existing_fixtures:
        print(json.dumps(dict(mode='plan-only', runtimeExecuted=False, matrix=matrix), indent=2))
        return 0
    if not args.output or args.output.resolve().is_relative_to(ROOT) or args.output.exists():
        parser.error('Use a new report path outside the repository')
    if not Path('/etc/os-release').is_file() or 'ID=ubuntu' not in Path('/etc/os-release').read_text():
        parser.error('Runtime mode is restricted to the identified Ubuntu guest')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Reserve the path before any Docker mutation so an unwritable destination cannot lose evidence.
    with args.output.open('x', encoding='utf-8') as output:
        report = Runner().run(matrix)
        json.dump(report, output, indent=2)
        output.write('\n')
    print(json.dumps(dict(status=report['status'], report=str(args.output), isolationAccepted=False)))
    return 0 if report['status'] == 'passed' else 2


if __name__ == '__main__':
    raise SystemExit(main())
