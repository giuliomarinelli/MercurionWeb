"""Real Meili 1.14 smoke on disposable, loopback-only Docker instances."""
import secrets
import subprocess
import tempfile
import time
from pathlib import Path

import transfer_chembl_indexes as transfer


def docker(*arguments):
    return subprocess.run(['docker', *arguments], capture_output=True, text=True, check=True).stdout.strip()


def main():
    names = []
    try:
        clients = []
        for role in ('source', 'target'):
            name = 'mercurion-chembl-qa-' + role + '-' + secrets.token_hex(5)
            key = secrets.token_hex(24)
            docker('run', '-d', '--rm', '--name', name, '--memory', '1g',
                   '-p', '127.0.0.1::7700', '-e', 'MEILI_MASTER_KEY=' + key,
                   '-e', 'MEILI_MAX_INDEXING_MEMORY=128MiB', '-e', 'MEILI_MAX_INDEXING_THREADS=1',
                   'sha256:8cd411ba5d9ec2dfce02e241305208eebacce0fd74a72bece21cadd03dc566ce')
            names.append(name)
            port = docker('port', name, '7700/tcp').split(':')[-1]
            client = transfer.TransferClient('http://127.0.0.1:' + port, key)
            for _ in range(120):
                try:
                    client.call('/version')
                    break
                except Exception:
                    time.sleep(.25)
            else:
                raise ValueError('qa-server-not-ready')
            clients.append(client)
        source, target = clients
        for uid in transfer.INDEXES:
            transfer.wait(source, source.call('/indexes', {'uid': uid, 'primaryKey': 'id'}, 'POST'))
            transfer.wait(source, source.call('/indexes/' + uid + '/settings',
                                             {'filterableAttributes': ['molregno']}, 'PATCH'))
            transfer.wait(source, source.call('/indexes/' + uid + '/documents',
                [{'id': 1, 'molregno': 1280, 'name': 'aspirin'}], 'POST'))
        transfer.wait(target, target.call('/indexes', {'uid': 'logs_staging', 'primaryKey': 'id'}, 'POST'))
        transfer.wait(target, target.call('/indexes/logs_staging/documents',
                                         [{'id': 'preserve', 'message': 'retained'}], 'POST'))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'bundle'
            transfer.export(source, root)
            transfer.import_bundle(target, root)
            transfer.import_bundle(target, root)
            assert target.call('/indexes/logs_staging/documents/preserve')['message'] == 'retained'
            for uid in transfer.INDEXES:
                result = target.call('/indexes/' + uid + '/search',
                                     {'q': 'aspirin', 'filter': 'molregno = 1280'}, 'POST')
                assert len(result['hits']) == 1
        print('REAL_MEILI_114_QA_PASSED')
    finally:
        for name in names:
            subprocess.run(['docker', 'rm', '-f', name], capture_output=True, check=False)


if __name__ == '__main__':
    main()
