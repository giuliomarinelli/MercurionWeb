"""Bounded IPv4 TCP identity fixture. No application protocol or credentials."""
import argparse
import errno
from datetime import datetime, timezone
import ipaddress
import json
from pathlib import Path
import re
import socket
import socketserver
import struct
import time

PORT = 18080
PROTOCOL = 'mercurion-topology-v1'


def now():
    return datetime.now(timezone.utc).isoformat()


def namespace_route(address, raw=None):
    """Return observed/path separately; absence alone is not a firewall decision."""
    try:
        raw = Path('/proc/net/route').read_text() if raw is None else raw
        lines = raw.splitlines()
        if not lines or not {'Iface','Destination','Mask'}.issubset(lines[0].split()):
            return False,None
        destination = struct.unpack('<I',socket.inet_aton(address))[0]
        matches = []
        for line in lines[1:]:
            fields = line.split()
            if len(fields) < 8:
                return False,None
            network, flags, mask = int(fields[1],16),int(fields[3],16),int(fields[7],16)
            if flags & 1 and destination & mask == network:
                matches.append(dict(interface=fields[0],prefixLength=mask.bit_count(),
                                    gateway=socket.inet_ntoa(struct.pack('<I',int(fields[2],16)))))
        return True,max(matches,key=lambda item:item['prefixLength']) if matches else None
    except (OSError,ValueError):
        return False,None


def resolve(host):
    result = dict(host=host, startedAtUtc=now(), status='invalid', addresses=[])
    try:
        addresses = sorted({entry[4][0] for entry in socket.getaddrinfo(host, PORT, socket.AF_INET, socket.SOCK_STREAM)})
        if not addresses or any(not ipaddress.ip_address(address).is_private for address in addresses):
            raise ValueError('Fixture target must resolve to private IPv4 addresses')
        result.update(status='resolved', addresses=addresses)
    except socket.gaierror as error:
        # Resolver outage is not a successful negative DNS test.
        absent = {socket.EAI_NONAME, getattr(socket, 'EAI_NODATA', socket.EAI_NONAME)}
        result.update(status='not-resolved' if error.errno in absent else 'invalid', errno=error.errno)
    except Exception as error:
        result['errorType'] = type(error).__name__
    return result


def client(host, identity, port=PORT):
    result = dict(host=host, identity=identity, startedAtUtc=now(), outcome='invalid', tcpConnected=False)
    dns = resolve(host)
    result['dns'] = dns
    if dns['status'] != 'resolved':
        result['outcome'] = 'dns-unavailable'
        return result
    # One connection, no retry to another IP after a failure.
    if not ipaddress.ip_address(dns['addresses'][0]).is_loopback:
        result['routeObserved'],result['route'] = namespace_route(dns['addresses'][0])
    try:
        with socket.create_connection((dns['addresses'][0], port), timeout=2) as connection:
            result['tcpConnected'] = True
            payload = b''
            while not payload.endswith(b'\n') and len(payload) < 512:
                part = connection.recv(512 - len(payload))
                if not part:
                    break
                payload += part
            value = json.loads(payload)
            result['outcome'] = ('reachable' if value == dict(protocol=PROTOCOL, identity=identity)
                                 else 'unexpected-service')
    except (TimeoutError, ConnectionRefusedError) as error:
        result.update(outcome='not-reachable' if not result['tcpConnected'] else 'unexpected-service',
                      errorType=type(error).__name__, errno=error.errno)
    except Exception as error:
        result.update(outcome='unexpected-service' if result['tcpConnected'] else 'invalid',
                      errorType=type(error).__name__, errno=getattr(error,'errno',None))
        if (not result['tcpConnected'] and getattr(error,'errno',None) == errno.ENETUNREACH
                and result.get('routeObserved') is True and result.get('route') is None):
            result['outcome'] = 'no-route'
    result['finishedAtUtc'] = now()
    return result


def serve(identity, bind='0.0.0.0', port=PORT, seconds=600):
    class Handler(socketserver.BaseRequestHandler):
        def handle(self):
            self.request.settimeout(1)
            self.request.sendall((json.dumps(dict(protocol=PROTOCOL, identity=identity)) + '\n').encode('ascii'))

    with socketserver.TCPServer((bind, port), Handler) as server:
        server.timeout = .2
        print(json.dumps(dict(identity=identity, port=server.server_address[1], startedAtUtc=now())), flush=True)
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            server.handle_request()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('serve', 'client', 'resolve'))
    parser.add_argument('--identity')
    parser.add_argument('--host')
    parser.add_argument('--bind', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=PORT)
    parser.add_argument('--seconds', type=int, choices=range(1, 601), default=600)
    args = parser.parse_args()
    if args.command != 'resolve' and (not args.identity or not re.fullmatch('[a-z0-9-]{1,64}', args.identity)):
        parser.error('A fixture identity is required')
    if args.command != 'serve' and (not args.host or not re.fullmatch('[a-zA-Z0-9.-]{1,253}', args.host)):
        parser.error('Use a fixture hostname or private IPv4 literal')
    if args.port != 0 and not 1024 <= args.port <= 65535:
        parser.error('Use an unprivileged port (or zero for an OS-assigned server port)')
    if args.command == 'serve':
        if args.bind != '0.0.0.0' and not ipaddress.ip_address(args.bind).is_loopback:
            parser.error('Serve in the container namespace or on loopback for unit tests')
        serve(args.identity, args.bind, args.port, args.seconds)
        return 0
    result = resolve(args.host) if args.command == 'resolve' else client(args.host, args.identity, args.port)
    print(json.dumps(result), flush=True)
    # Unreachable is a valid measurement, not an automatic test pass.
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
