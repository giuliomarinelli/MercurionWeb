"""Loopback-only SSH forward and HTTP viewing bridge for the private Nginx vhost.

The bridge changes Host only. It does not emulate TLS, rewrite cookies or bypass
application authentication. Login/OAuth and WebSocket acceptance remain separate.
"""
import argparse
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import ipaddress
import json
import os
from pathlib import Path
import socket
import subprocess
import time

HOST = 'preview.mercurion.app'
HOP = {'connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer',
       'transfer-encoding','upgrade','content-length','host','forwarded','x-forwarded-for',
       'x-forwarded-host','x-forwarded-proto','x-real-ip'}


class LoopbackServer(ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
        super().server_bind()


def receipt(root):
    manifest = json.loads((root / 'application-bootstrap.json').read_text(encoding='utf-8'))
    matches = []
    for path in (root / 'receipts').glob('application-verification-*.json'):
        record = json.loads(path.read_text(encoding='utf-8'))
        if (record.get('runId') == manifest['runId'] and record.get('status') == 'passed'
                and record.get('containerMutationsPerformed') is False
                and set(record.get('checks', {})) == {'backendHealthThroughEdge','frontendThroughEdge','tox21RealRpc'}
                and all(value is True for value in record['checks'].values())):
            address = ipaddress.ip_address(record['edgeAddress'])
            if address.version != 4 or not address.is_private or address.is_loopback or address.is_unspecified:
                raise ValueError('unexpected-edge-address')
            matches.append((path.stat().st_mtime_ns, str(address)))
    if not matches:
        raise ValueError('successful-existing-application-verification-required')
    return max(matches)[1]


def ssh_arguments(edge, port):
    return ['ssh.exe','-N','-T','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes',
            '-o','ServerAliveInterval=15','-o','ServerAliveCountMax=2',
            '-L',f'127.0.0.1:{port}:{edge}:80','mercurion-server']


def handler(upstream_port):
    class Bridge(BaseHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def log_message(self, *_args):
            pass  # Never record URLs, authorization, cookies or response bodies.

        def forward(self):
            local = str(self.server.server_port)
            allowed = {'localhost:' + local, '127.0.0.1:' + local}
            if self.headers.get('Host') not in allowed:
                self.send_error(403); return
            origin = self.headers.get('Origin')
            if origin and origin not in {'http://' + name for name in allowed}:
                self.send_error(403); return
            if self.headers.get('Upgrade') or self.headers.get('Transfer-Encoding'):
                self.send_error(501); return
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                self.send_error(400); return
            if not 0 <= length <= 4 * 1024 * 1024:
                self.send_error(413); return
            body = self.rfile.read(length) if length else None
            headers = {name:value for name,value in self.headers.items() if name.lower() not in HOP}
            headers['Host'] = HOST
            connection = http.client.HTTPConnection('127.0.0.1', upstream_port, timeout=20)
            try:
                connection.request(self.command, self.path, body=body, headers=headers)
                response = connection.getresponse()
                content = response.read(16 * 1024 * 1024 + 1)
                if len(content) > 16 * 1024 * 1024:
                    self.send_error(502); return
                self.send_response(response.status)
                for name,value in response.getheaders():
                    if name.lower() not in HOP:
                        self.send_header(name,value)
                size = response.getheader('Content-Length') if self.command == 'HEAD' else str(len(content))
                self.send_header('Content-Length', size or '0')
                self.end_headers()
                if self.command != 'HEAD': self.wfile.write(content)
            except (OSError, http.client.HTTPException):
                self.send_error(502)
            finally:
                connection.close()

        do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = do_OPTIONS = forward

    return Bridge


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--port', type=int, default=18888)
    parser.add_argument('--ssh-port', type=int, default=18889)
    args = parser.parse_args()
    if os.name != 'nt' or not all(1024 <= port <= 65535 for port in (args.port,args.ssh_port)) or args.port == args.ssh_port:
        raise ValueError('windows-and-distinct-unprivileged-local-ports-required')
    edge = receipt(args.bundle.resolve())
    # Reserve the browser listener before starting SSH, and fail on collisions.
    server = LoopbackServer(('127.0.0.1',args.port),handler(args.ssh_port))
    try:
        with socket.socket() as check:
            if hasattr(socket,'SO_EXCLUSIVEADDRUSE'): check.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
            check.bind(('127.0.0.1',args.ssh_port))
        print('Forward SSH loopback: inserisci la passphrase nel terminale. Ctrl+C chiude questo forward.',flush=True)
        process = subprocess.Popen(ssh_arguments(edge,args.ssh_port))
        try:
            deadline = time.monotonic() + 300
            while True:
                if process.poll() is not None: raise ValueError('ssh-forward-ended')
                try:
                    with socket.create_connection(('127.0.0.1',args.ssh_port),timeout=.3): break
                except OSError:
                    if time.monotonic() >= deadline: raise ValueError('ssh-forward-timeout')
                    time.sleep(.3)
            connection = http.client.HTTPConnection('127.0.0.1',args.ssh_port,timeout=10)
            try:
                connection.request('GET','/health',headers={'Host':HOST})
                response = connection.getresponse()
                if response.status != 200 or not isinstance(json.loads(response.read()),dict):
                    raise ValueError('forwarded-health-failed')
            finally: connection.close()
            print(json.dumps(dict(status='private-nginx-forward-ready',url=f'http://localhost:{args.port}',
                bindAddress='127.0.0.1',edgeAddress=edge,cloudflareChanged=False,authenticatedAcceptance=False)),flush=True)
            while process.poll() is None:
                server.timeout=1
                server.handle_request()
            raise ValueError('ssh-forward-ended')
        finally:
            if process.poll() is None:
                process.terminate()
                try: process.wait(timeout=5)
                except subprocess.TimeoutExpired: process.kill(); process.wait()
    except KeyboardInterrupt:
        print('Forward privato chiuso.',flush=True)
    finally:
        server.server_close()


if __name__ == '__main__':
    try: main()
    except Exception as error:
        print(json.dumps(dict(status='private-forward-failed',errorType=type(error).__name__)))
        raise SystemExit(1)
