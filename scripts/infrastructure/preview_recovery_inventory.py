"""Owner-invoked metadata-only inventory. Does not restore secrets or start services."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

import preview_server_bundle as bundle
from synthetic_secret_delivery import Step, COMMON, remote, transport


def execute(root, manifest):
    if os.name != 'nt':
        raise ValueError('windows-owner-terminal-required')
    identifier = manifest['runId']
    inspection = uuid.uuid4().hex
    output = root / 'receipts' / ('recovery-inventory-' + inspection + '.json')
    output.parent.mkdir(exist_ok=True)
    source = Path(__file__).with_name('guest_preview_recovery_inventory.py').read_text(encoding='utf-8')
    digest = hashlib.sha256((root / 'server-bootstrap.json').read_bytes()).hexdigest()
    # Code is sent in the SSH command itself, not executed from writable staging.
    code = 'import sys\nsys.argv=' + repr(['inventory', '--run-id', identifier,
        '--manifest-sha256', digest, '--inspection-id', inspection]) + '\n' + source
    print(json.dumps(dict(runId=identifier, inspectionId=inspection, reportPath=str(output))), flush=True)
    status, _ = transport(Step('inventory', remote(code, sudo=True), interactive=True))
    guest = '/opt/mercurion/releases/server-' + identifier + '/' + output.name
    if output.exists():
        raise ValueError('report-already-exists')
    if subprocess.run(['scp.exe', *COMMON, 'mercurion-server:' + guest, str(output)], timeout=180).returncode:
        raise ValueError('report-download-failed-preserve-inspection-id')
    report = json.loads(output.read_text(encoding='utf-8'))
    if (status or report.get('status') != 'inventoried' or report.get('runId') != identifier
            or report.get('inspectionId') != inspection or report.get('credentialsRead') is not False
            or report.get('servicesStarted') is not False):
        raise ValueError('inventory-failed-review-sanitized-report')
    return dict(status=report['status'], runId=identifier, inspectionId=inspection,
        coldRecoveryCandidate=report['coldRecoveryCandidate'], reportPath=str(output),
        servicesStarted=False, credentialsRead=False, isolationAccepted=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    try:
        root = args.bundle.resolve()
        manifest = bundle.verify(root)
        if args.execute:
            print('Inventario di recupero: passphrase SSH e sudo solo nel terminale. Nessun avvio o lettura di segreti.', flush=True)
            print(json.dumps(execute(root, manifest)))
        else:
            print(json.dumps(dict(status='inventory-plan', runId=manifest['runId'],
                sshStarted=False, credentialsRead=False, servicesStarted=False)))
    except Exception:
        print(json.dumps(dict(code='PREVIEW_RECOVERY_INVENTORY_FAILED',
            detail='Preserve inspection id and report; do not rerun bootstrap or remove volumes')), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
