"""Bounded private TCP/443, TCP/53 and DNS UDP/53 probes; no policy changes."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import errno
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import socketserver
import struct
import subprocess
import threading
import time
import uuid

HOST = '10.203.240.1'
IMAGE = 'sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
LABEL = 'mercurion.inf-vm-02'


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, value, owner=None):
    temporary = path.with_suffix(path.suffix + '.tmp')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')
    if owner is not None:
        os.chown(temporary, *owner)
    temporary.replace(path)


def validate_nonce(nonce):
    if not isinstance(nonce, str) or not re.fullmatch('[a-f0-9]{32}', nonce):
        raise ValueError('Invalid public run marker')


def targets(dns_address):
    address = ipaddress.ip_address(dns_address)
    if not any(address in ipaddress.ip_network(prefix)
               for prefix in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')):
        raise ValueError('DNS control must be the measured private virtual-adapter address')
    return [dict(id='tcp-443', transport='tcp', address=HOST, port=443),
            dict(id='tcp-53', transport='tcp', address=HOST, port=53),
            dict(id='udp-53', transport='dns-udp', address=dns_address, port=53)]


def validate_config(config, check_expiry=True):
    validate_nonce(config['runId'])
    validate_nonce(config['nonce'])
    if config['targets'] != targets(config['targets'][2]['address']):
        raise ValueError('Unexpected target set')
    start = datetime.fromisoformat(config['readyAtUtc'])
    end = datetime.fromisoformat(config['expiresAtUtc'])
    if start.tzinfo is None or end.tzinfo is None or not 0 < (end-start).total_seconds() <= 600:
        raise ValueError('Invalid test window')
    if check_expiry and not start <= datetime.now(timezone.utc) < end:
        raise ValueError('Test window not active')


def dns_query(nonce):
    validate_nonce(nonce)
    question = b'\x20' + nonce.encode('ascii') + b'\x07invalid\x00' + struct.pack('!HH', 1, 1)
    return struct.pack('!HHHHHH', int(nonce[:4], 16), 0x0100, 1, 0, 0, 0) + question


def dns_response_valid(data, query):
    if len(data) < len(query):
        return False
    transaction, flags, questions, _, _, _ = struct.unpack('!HHHHHH', data[:12])
    return (transaction == struct.unpack('!H', query[:2])[0] and bool(flags & 0x8000)
            and questions == 1 and data[12:len(query)] == query[12:])


def route_for(address, raw=None):
    """Inspect Linux main-table routes in this namespace, without installing iproute2."""
    raw = Path('/proc/net/route').read_text() if raw is None else raw
    destination = struct.unpack('<I', socket.inet_aton(address))[0]
    matches = []
    for line in raw.splitlines()[1:]:
        fields = line.split()
        if len(fields) < 8:
            continue
        network, flags, mask = int(fields[1], 16), int(fields[3], 16), int(fields[7], 16)
        if flags & 1 and destination & mask == network:
            matches.append(dict(interface=fields[0], prefixLength=mask.bit_count(),
                                gateway=socket.inet_ntoa(struct.pack('<I', int(fields[2], 16)))))
    return max(matches, key=lambda item: item['prefixLength']) if matches else None


def probe(transport, address, port, nonce, timeout=3, require_route=False):
    validate_nonce(nonce)
    ip = ipaddress.ip_address(address)
    if ip.version != 4 or not (ip.is_private or ip.is_loopback) or ip.is_unspecified or ip.is_multicast:
        raise ValueError('Explicit private IPv4 target required')
    if transport not in ('tcp', 'dns-udp') or port not in (53, 443) and not 1024 <= port <= 65535:
        raise ValueError('Unsupported protocol/port')
    result = dict(observedAtUtc=now(), transport=transport, address=address, port=port,
                  nonce=nonce, isolationAccepted=False, outcome='invalid-path')
    try:
        if require_route and not ip.is_loopback:
            result['route'] = route_for(address)
            if result['route'] is None:
                return result
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM if transport == 'tcp' else socket.SOCK_DGRAM) as client:
            client.settimeout(timeout)
            try:
                client.connect((address, port))
                result['localAddress'] = client.getsockname()[0]
                if transport == 'dns-udp':
                    query = dns_query(nonce)
                    client.send(query)
                    data = client.recv(512)
                    valid = dns_response_valid(data, query)
                    if valid:
                        result['dnsRcode'] = data[3] & 15
                else:
                    data = b''
                    while len(data) < 128 and not data.endswith(b'\n'):
                        chunk = client.recv(128-len(data))
                        if not chunk:
                            break
                        data += chunk
                    valid = data == f'INF_VM_PRIVATE {nonce}\n'.encode('ascii')
                    client.shutdown(socket.SHUT_WR)
                result['outcome'] = 'reachable' if valid else 'unexpected-service'
            except OSError as error:
                # A connected TCP service with a bad/late marker is not a blocked path.
                connected_tcp = transport == 'tcp' and 'localAddress' in result
                route_error = error.errno in (errno.ENETUNREACH, errno.EHOSTUNREACH, 10051, 10065)
                result.update(outcome='unexpected-service' if connected_tcp else
                              'invalid-path' if route_error else 'not-reachable',
                              errorType=type(error).__name__, errno=error.errno)
    except (OSError, ValueError) as error:
        result.update(errorType=type(error).__name__)
    finally:
        result['finishedAtUtc'] = now()
    return result


def prepare_dns(address, nonce, attempts, client=probe):
    """Bounded readiness only, before the measurement window; retain every attempt."""
    for _ in range(3):
        result = client('dns-udp', address, 53, nonce)
        attempts.append(result)
        if result['outcome'] == 'reachable':
            return
        if result['outcome'] != 'not-reachable':
            break
    raise RuntimeError('DNS control not ready; no measurement window started')


@contextmanager
def control_servers(address, nonce, tcp_ports=(0,), udp=True):
    validate_nonce(nonce)
    servers, workers = [], []

    class TcpHandler(socketserver.BaseRequestHandler):
        def handle(self):
            self.request.settimeout(1)
            self.request.sendall(f'INF_VM_PRIVATE {nonce}\n'.encode('ascii'))
            # Let the client initiate close, avoiding fixed server ports in TIME_WAIT.
            try:
                self.request.recv(1)
            except socket.timeout:
                pass

    class DnsHandler(socketserver.BaseRequestHandler):
        def handle(self):
            data, connection = self.request
            query = dns_query(nonce)
            if data == query:
                response = struct.pack('!HHHHHH', int(nonce[:4], 16), 0x8183, 1, 0, 0, 0) + query[12:]
                connection.sendto(response, self.client_address)

    class ExclusiveTcpServer(socketserver.TCPServer):
        allow_reuse_address = False

        def server_bind(self):
            if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            super().server_bind()

    try:
        for port in tcp_ports:
            servers.append(ExclusiveTcpServer((address, port), TcpHandler))
        if udp:
            servers.append(socketserver.UDPServer((address, 0), DnsHandler))
        for server in servers:
            worker = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .1}, daemon=True)
            worker.start()
            workers.append(worker)
        yield dict(tcp=servers[0].server_address[1], udp=servers[-1].server_address[1] if udp else None)
    finally:
        for server in servers[:len(workers)]:
            server.shutdown()
        for worker in workers:
            worker.join(timeout=3)
        for server in servers:
            server.server_close()


def serve_host(output, run_id, dns_address, seconds=600):
    validate_nonce(run_id)
    if not 1 <= seconds <= 600:
        raise ValueError('Duration out of bounds')
    endpoints = []
    output.mkdir(parents=True, exist_ok=False)
    nonce = uuid.uuid4().hex
    report = dict(schemaVersion=1, runId=run_id, nonce=nonce, targets=endpoints,
                  preparation=[], controls=[], status='invalid', isolationAccepted=False)

    def control_round():
        current = []
        for endpoint in endpoints:
            result = probe(endpoint['transport'], endpoint['address'], endpoint['port'], nonce)
            result['targetId'] = endpoint['id']
            current.append(result)
        report['controls'].extend(current)
        if any(item['outcome'] != 'reachable' for item in current):
            raise RuntimeError('Host positive control failed')

    try:
        endpoints.extend(targets(dns_address))
        with control_servers(HOST, nonce, tcp_ports=(443, 53), udp=False):
            prepare_dns(dns_address, nonce, report['preparation'])
            control_round()
            ready = dict(schemaVersion=1, runId=run_id, nonce=nonce, targets=endpoints,
                         readyAtUtc=now(), expiresAtUtc=(datetime.now(timezone.utc)+timedelta(seconds=seconds)).isoformat())
            write_json(output/'ready.json', ready)
            deadline = time.monotonic()+seconds
            next_control = time.monotonic()+5
            while time.monotonic() < deadline and not (output/'stop').exists():
                time.sleep(.2)
                if time.monotonic() >= next_control:
                    control_round()
                    next_control = time.monotonic()+5
            control_round()
            report.update(status='controls-passed', stopReason='requested' if (output/'stop').exists() else 'deadline')
    except (OSError, ValueError, RuntimeError) as error:
        report['errorType'] = type(error).__name__
    finally:
        report.update(finishedAtUtc=now(), closed=True)
        write_json(output/'result.json', report)
    return report


def docker(*args, timeout=40):
    environment = {key: value for key, value in os.environ.items() if key not in ('DOCKER_HOST', 'DOCKER_CONTEXT')}
    return subprocess.run(['docker', '--host', 'unix:///var/run/docker.sock', *args], env=environment,
                          check=True, capture_output=True, text=True, timeout=timeout).stdout.strip()


def run_origin(config, origin, address, ports, client):
    cases = []
    for endpoint in config['targets']:
        validate_config(config)
        protocol = endpoint['transport']
        control_port = ports['tcp' if protocol == 'tcp' else 'udp']
        before = client(protocol, address, control_port)
        if before['outcome'] != 'reachable':
            raise RuntimeError('Origin control failed before target attempt')
        attempted = client(protocol, endpoint['address'], endpoint['port'])
        after = client(protocol, address, control_port)
        if after['outcome'] != 'reachable':
            raise RuntimeError('Origin control failed after target attempt')
        cases.append(dict(origin=origin, targetId=endpoint['id'], controlBefore=before,
                          hostProbe=attempted, controlAfter=after))
    return cases


def run_guest(root, config, invoke=docker):
    report = dict(schemaVersion=1, runId=config.get('runId'), nonce=config.get('nonce'), startedAtUtc=now(),
                  scope='private-ports-ipv4', cases=[], cleanupErrors=[], status='invalid', isolationAccepted=False)
    owned, network_id = [], None
    source = str(root/'private_port_probe.py')
    try:
        validate_config(config)
        if invoke('version', '--format', '{{.Server.Os}}/{{.Server.Arch}}') != 'linux/amd64':
            raise RuntimeError('Unexpected Docker platform')
        image = json.loads(invoke('image', 'inspect', IMAGE))[0]
        if (image['Id'], image['Os'], image['Architecture']) != (IMAGE, 'linux', 'amd64'):
            raise RuntimeError('Verified local image missing; no pull attempted')
        report.update(imageId=IMAGE, dockerPlatform='linux/amd64')
        with control_servers('127.0.0.1', config['nonce']) as ports:
            report['cases'].extend(run_origin(config, 'guest', '127.0.0.1', ports,
                                             lambda protocol, address, port: probe(protocol, address, port, config['nonce'], require_route=True)))
        name = 'inf-vm02-private-' + config['runId']
        network_id = invoke('network', 'create', '--driver', 'bridge', '--label', f'{LABEL}={config["runId"]}', name)
        if not re.fullmatch('[a-f0-9]{64}', network_id):
            network_id = None
            raise RuntimeError('Invalid network identifier')
        for network in ('bridge', name):
            def create(*command):
                identifier = invoke('create', '--pull', 'never', '--network', network,
                                    '--label', f'{LABEL}={config["runId"]}', '--read-only', '--user', '65534:65534',
                                    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true',
                                    '--memory', '128m', '--cpus', '0.5', '--pids-limit', '64',
                                    '--mount', f'type=bind,source={source},target=/probe.py,readonly',
                                    '--entrypoint', 'python', IMAGE, '-B', '/probe.py', *command)
                if not re.fullmatch('[a-f0-9]{64}', identifier):
                    raise RuntimeError('Invalid container identifier')
                owned.append(identifier)
                return identifier

            server = create('control', '--nonce', config['nonce'])
            invoke('start', server)
            address = invoke('inspect', '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', server)
            deadline = time.monotonic()+10
            while True:
                raw = invoke('logs', server)
                if raw:
                    ports = json.loads(raw)
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError('Container controls not ready')
                time.sleep(.2)

            def container_client(protocol, remote, port):
                identifier = create('client', '--transport', protocol, '--address', remote,
                                    '--port', str(port), '--nonce', config['nonce'])
                result = json.loads(invoke('start', '--attach', identifier, timeout=20))
                if int(invoke('inspect', '--format', '{{.State.ExitCode}}', identifier)):
                    raise RuntimeError('Client execution failed')
                if (result['nonce'], result['transport'], result['address'], result['port']) != (config['nonce'], protocol, remote, port):
                    raise RuntimeError('Mismatched client result')
                return result

            report['cases'].extend(run_origin(config, network, address, ports, container_client))
        report['status'] = ('observed-path-not-reachable' if len(report['cases']) == 9 and
                            all(case['hostProbe']['outcome'] == 'not-reachable' for case in report['cases']) else 'review-required')
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


def correlate(root):
    ready = json.loads((root/'host/ready.json').read_text(encoding='utf-8-sig'))
    host = json.loads((root/'host/result.json').read_text(encoding='utf-8-sig'))
    guest = json.loads((root/'private-port-probe.json').read_text(encoding='utf-8-sig'))
    validate_config(ready, check_expiry=False)
    if (host['runId'], guest['runId'], host['nonce'], guest['nonce']) != (ready['runId'], ready['runId'], ready['nonce'], ready['nonce']):
        raise ValueError('Reports do not belong to this run')
    if host['targets'] != ready['targets'] or host['status'] != 'controls-passed' or not host['closed']:
        raise ValueError('Host controls incomplete')
    if guest['status'] != 'observed-path-not-reachable' or guest['cleanupErrors'] or guest.get('imageId') != IMAGE or guest.get('dockerPlatform') != 'linux/amd64':
        raise ValueError('Guest report requires review')
    if any(item['outcome'] != 'reachable' for item in host['controls']):
        raise ValueError('A host positive control failed')
    preparation = host['preparation']
    dns_target = ready['targets'][2]
    if not 1 <= len(preparation) <= 3 or preparation[-1]['outcome'] != 'reachable' or any(
            item['outcome'] not in ('reachable', 'not-reachable') or
            (item['address'], item['port'], item['transport'], item['nonce']) !=
            (dns_target['address'], 53, 'dns-udp', ready['nonce']) or
            datetime.fromisoformat(item['finishedAtUtc']) > datetime.fromisoformat(ready['readyAtUtc'])
            for item in preparation):
        raise ValueError('Invalid startup readiness')
    expected = {(origin, target['id']) for origin in ('guest', 'bridge', 'inf-vm02-private-'+ready['runId']) for target in ready['targets']}
    observed = [(case['origin'], case['targetId']) for case in guest['cases']]
    if len(observed) != 9 or set(observed) != expected:
        raise ValueError('Missing or duplicate cases')
    for case in guest['cases']:
        endpoint = next(item for item in ready['targets'] if item['id'] == case['targetId'])
        attempted = case['hostProbe']
        if (attempted['address'], attempted['port'], attempted['transport'], attempted['nonce'], attempted['outcome']) != (
                endpoint['address'], endpoint['port'], endpoint['transport'], ready['nonce'], 'not-reachable') or not attempted.get('route'):
            raise ValueError('Invalid or reachable target attempt')
        start, end = (datetime.fromisoformat(attempted[key]) for key in ('observedAtUtc', 'finishedAtUtc'))
        if not datetime.fromisoformat(ready['readyAtUtc']) <= start <= end <= datetime.fromisoformat(ready['expiresAtUtc']):
            raise ValueError('Attempt outside active window')
        before, after = case['controlBefore'], case['controlAfter']
        if any(item['outcome'] != 'reachable' or item['nonce'] != ready['nonce'] or item['transport'] != endpoint['transport'] for item in (before, after)):
            raise ValueError('Origin control invalid')
        if (before['address'], before['port']) != (after['address'], after['port']) or not (
                datetime.fromisoformat(before['finishedAtUtc']) <= start and datetime.fromisoformat(after['observedAtUtc']) >= end):
            raise ValueError('Origin controls do not bracket attempt')
        controls = [item for item in host['controls'] if item['targetId'] == endpoint['id']]
        if any((item['address'], item['port'], item['transport'], item['nonce']) !=
               (endpoint['address'], endpoint['port'], endpoint['transport'], ready['nonce']) for item in controls) or not (
                any(datetime.fromisoformat(item['finishedAtUtc']) < start for item in controls) and
                any(datetime.fromisoformat(item['observedAtUtc']) > end for item in controls)):
            raise ValueError('Host controls do not bracket attempt')
    return dict(runId=ready['runId'], scope='private-ports-ipv4', status='observed-path-not-reachable',
                caseCount=9, hostControlCount=len(host['controls']), isolationAccepted=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('host-preflight', 'serve-host', 'client', 'control', 'run-guest', 'correlate'))
    parser.add_argument('--directory', type=Path)
    parser.add_argument('--dns-address')
    parser.add_argument('--run-id')
    parser.add_argument('--nonce')
    parser.add_argument('--transport', choices=('tcp', 'dns-udp'))
    parser.add_argument('--address')
    parser.add_argument('--port', type=int)
    args = parser.parse_args()
    if args.command == 'client':
        print(json.dumps(probe(args.transport, args.address, args.port, args.nonce, require_route=True)), flush=True)
    elif args.command == 'control':
        if not Path('/.dockerenv').is_file():
            raise RuntimeError('Wildcard controls run only inside the probe container')
        with control_servers('0.0.0.0', args.nonce) as ports:
            print(json.dumps(ports), flush=True)
            time.sleep(120)
    elif args.command == 'host-preflight':
        targets(args.dns_address)
        nonce = uuid.uuid4().hex
        with control_servers(HOST, nonce, tcp_ports=(443, 53), udp=False):
            preparation = []
            prepare_dns(args.dns_address, nonce, preparation)
            checked = [probe(item['transport'], item['address'], item['port'], nonce) for item in targets(args.dns_address)]
            if any(item['outcome'] != 'reachable' for item in checked):
                print(json.dumps(dict(status='host-preflight-failed', controls=checked)), flush=True)
                raise RuntimeError('Host positive preflight failed')
        print(json.dumps(dict(status='host-preflight-passed', preparationAttempts=len(preparation), isolationAccepted=False)))
    elif args.command == 'serve-host':
        report = serve_host(args.directory, args.run_id, args.dns_address)
        return 0 if report['status'] == 'controls-passed' else 2
    elif args.command == 'correlate':
        result = correlate(args.directory)
        write_json(args.directory/'correlation.json', result)
        print(json.dumps(result))
    elif args.command == 'run-guest':
        if 'ID=ubuntu' not in Path('/etc/os-release').read_text() or os.geteuid() != 0:
            raise RuntimeError('Run on the identified Ubuntu guest via sudo')
        root = args.directory.resolve()
        config = json.loads((root/'config.json').read_text(encoding='utf-8-sig'))
        owner = (int(os.environ['SUDO_UID']), int(os.environ['SUDO_GID']))
        report = run_guest(root, config)
        write_json(root/'private-port-probe.json', report, owner=owner)
        print(json.dumps(dict(runId=report['runId'], status=report['status'], caseCount=len(report['cases']), isolationAccepted=False)), flush=True)
        return 0 if report['status'] == 'observed-path-not-reachable' else 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
