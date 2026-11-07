"""INF-VM-02: temporary TCP canary with positive controls; no firewall changes."""
import argparse
from datetime import datetime, timedelta, timezone
import ipaddress
import json
from pathlib import Path
import socket
import socketserver
import threading
import time
import uuid


def now():
    return datetime.now(timezone.utc).isoformat()


def target(address, port):
    ip = ipaddress.ip_address(address)
    if ip.is_unspecified or ip.is_multicast or not (ip.is_private or ip.is_loopback):
        raise ValueError('Use an explicit private or loopback test address')
    if not 1024 <= port <= 65535:
        raise ValueError('Use an unprivileged canary port')
    if ip.version == 6:
        scope = getattr(ip, 'scope_id', None)
        if ip.is_link_local and not scope:
            raise ValueError('Link-local IPv6 requires a local interface scope')
        scope_id = int(scope) if scope and scope.isdigit() else socket.if_nametoindex(scope) if scope else 0
        return socket.AF_INET6, (str(ip).split('%')[0], port, 0, scope_id)
    return socket.AF_INET, (str(ip), port)


def probe(address, port, nonce, timeout=3):
    family, endpoint = target(address, port)
    result = dict(observedAtUtc=now(), address=address, port=port, nonce=nonce,
                  isolationAccepted=False)
    with socket.socket(family, socket.SOCK_STREAM) as client:
        client.settimeout(timeout)
        try:
            client.connect(endpoint)
        except OSError as error:
            result.update(outcome='not-reachable', errorType=type(error).__name__, errno=error.errno)
            return result
        try:
            data = b''
            while len(data) < 128 and not data.endswith(b'\n'):
                chunk = client.recv(128 - len(data))
                if not chunk:
                    break
                data += chunk
        except OSError:
            result.update(outcome='unexpected-service')
            return result
    result.update(outcome='reachable' if data == f'INF_VM_02 {nonce}\n'.encode('ascii') else 'unexpected-service')
    return result


def serve(address, output, seconds):
    # Port zero is allocated by the OS; probe validation still rejects privileged ports.
    ip = ipaddress.ip_address(address)
    family, endpoint = target(address, 49152)
    endpoint = (endpoint[0], 0, *endpoint[2:])
    output.mkdir(parents=True, exist_ok=False)
    nonce = uuid.uuid4().hex
    connections = []
    controls = []

    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            self.request.settimeout(1)
            self.request.sendall(f'INF_VM_02 {nonce}\n'.encode('ascii'))
            if len(connections) < 256:
                connections.append(dict(observedAtUtc=now(), address=self.client_address[0]))

    class Server(socketserver.TCPServer):
        address_family = family
        allow_reuse_address = False

    report = dict(schemaVersion=1, address=str(ip), nonce=nonce, isolationAccepted=False,
                  controls=controls, connections=connections, status='invalid')
    try:
        with Server(endpoint, Handler) as server:
            port = server.server_address[1]
            report['port'] = port
            worker = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .1}, daemon=True)
            worker.start()
            try:
                first = probe(address, port, nonce)
                controls.append(first)
                if first['outcome'] != 'reachable':
                    raise RuntimeError('Local positive control failed; do not run a negative test')
                ready = dict(schemaVersion=1, address=address, port=port, nonce=nonce,
                             readyAtUtc=now(), expiresAtUtc=(datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat())
                (output / 'ready.json').write_text(json.dumps(ready, indent=2) + '\n', encoding='utf-8')
                print(json.dumps(ready), flush=True)
                deadline = time.monotonic() + seconds
                next_control = time.monotonic() + 5
                while time.monotonic() < deadline:
                    if (output / 'stop').exists():
                        break
                    time.sleep(min(.25, max(0, deadline - time.monotonic())))
                    if time.monotonic() >= next_control:
                        control = probe(address, port, nonce)
                        controls.append(control)
                        if control['outcome'] != 'reachable':
                            raise RuntimeError('Local canary control failed during the test window')
                        next_control = time.monotonic() + 5
                final = probe(address, port, nonce)
                controls.append(final)
                if final['outcome'] != 'reachable':
                    raise RuntimeError('Final local canary control failed')
                report['stopReason'] = 'requested' if (output / 'stop').exists() else 'deadline'
                report['status'] = 'controls-passed'
            finally:
                server.shutdown()
                worker.join(timeout=3)
                if worker.is_alive():
                    report['status'] = 'invalid'
    finally:
        report['finishedAtUtc'] = now()
        (output / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(status=report['status'], isolationAccepted=False, closed=True)), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    server = commands.add_parser('serve')
    server.add_argument('--bind', required=True, help='Explicit host virtual-adapter IP; never 0.0.0.0/::')
    server.add_argument('--output', type=Path, required=True, help='New evidence directory outside Git')
    server.add_argument('--seconds', type=int, default=300, choices=range(1, 601), metavar='1..600')
    client = commands.add_parser('probe')
    client.add_argument('--host', required=True)
    client.add_argument('--port', required=True, type=int)
    client.add_argument('--nonce', required=True, help='Public run marker from ready.json, not a credential')
    args = parser.parse_args()
    if args.command == 'serve':
        serve(args.bind, args.output, args.seconds)
    else:
        if len(args.nonce) != 32 or any(c not in '0123456789abcdef' for c in args.nonce):
            parser.error('nonce must be the 32-character hexadecimal run marker')
        print(json.dumps(probe(args.host, args.port, args.nonce)))


if __name__ == '__main__':
    main()
