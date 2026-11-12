"""Owner-only cold recovery transport. Stable values travel only over SSH stdin."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import uuid

import preview_server_bundle as bundle
from preview_server_bootstrap import payload, fetch
from synthetic_secret_delivery import Step, STAGE, CLEANUP, remote, transport

STAGE_HELPERS = STAGE.replace('delivery-', 'recovery-').replace('secret_delivery.py', 'helpers.json')
REMOVE_HELPERS = CLEANUP.replace('delivery-', 'recovery-').replace('secret_delivery.py', 'helpers.json')
LOAD = r'''
import hashlib,json,os,pathlib,pwd,re,stat,sys,types
attempt,digest,phase,rid,inspection,manifest=sys.argv[1:]
assert all(re.fullmatch('[a-f0-9]{32}',v) for v in (attempt,rid,inspection))
assert re.fullmatch('[a-f0-9]{64}',digest) and re.fullmatch('[a-f0-9]{64}',manifest)
assert phase in ('prepare','receive','activate')
assert (os.geteuid()==0)==(phase!='receive')
owner=pwd.getpwnam(os.environ['SUDO_USER']) if phase!='receive' else pwd.getpwuid(os.geteuid())
assert owner.pw_uid>0
base=pathlib.Path(owner.pw_dir)/'.mercurion-infra'
run=base/('recovery-'+attempt)
for path in (base,run):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
fd=os.open(run/'helpers.json',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
with os.fdopen(fd,'rb') as stream:
 info=os.fstat(stream.fileno());assert stat.S_ISREG(info.st_mode) and info.st_nlink==1 and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o600
 raw=stream.read(131073)
assert len(raw)<=131072 and hashlib.sha256(raw).hexdigest()==digest
sources=json.loads(raw)
assert set(sources)=={'guest_preview_recovery_inventory','guest_preview_cold_recovery'}
module=types.ModuleType('guest_preview_recovery_inventory')
sys.modules[module.__name__]=module
exec(compile(sources[module.__name__],'<verified-recovery-inventory>','exec'),module.__dict__)
sys.argv=['recovery',phase,'--run-id',rid,'--manifest-sha256',manifest,'--inspection-id',inspection,'--attempt-id',attempt]
exec(compile(sources['guest_preview_cold_recovery'],'<verified-cold-recovery>','exec'),{'__name__':'__main__'})
'''


def inspection(root, manifest, identifier):
    value = json.loads((root / 'receipts' / ('recovery-inventory-' + identifier + '.json')).read_text(encoding='utf-8'))
    if (value.get('runId') != manifest['runId'] or value.get('inspectionId') != identifier
            or value.get('status') != 'inventoried' or value.get('coldRecoveryCandidate') is not True):
        raise ValueError('successful-cold-inventory-required')
    return value


def execute(root, manifest, inspected, configuration):
    if os.name != 'nt':
        raise ValueError('windows-owner-terminal-required')
    # Only the owner invokes --execute: this file is never read in an agent session.
    data = payload(json.loads(configuration.read_text(encoding='utf-8-sig')), manifest['runId'])
    sources = {name: Path(__file__).with_name(name + '.py').read_text(encoding='utf-8')
               for name in ('guest_preview_recovery_inventory', 'guest_preview_cold_recovery')}
    helpers = json.dumps(sources, separators=(',', ':')).encode()
    if len(helpers) > 131072:
        raise ValueError('helper-size')
    checksum = hashlib.sha256(helpers).hexdigest()
    digest = hashlib.sha256((root / 'server-bootstrap.json').read_bytes()).hexdigest()
    attempt = uuid.uuid4().hex
    state_path = root / 'receipts' / ('recovery-' + attempt + '-state.json')
    state = dict(runId=manifest['runId'], attemptId=attempt, inspectionId=inspected['inspectionId'],
                 phase='validated-host', status='pending', isolationAccepted=False)
    with state_path.open('x', encoding='utf-8') as stream:
        json.dump(state, stream)
    print(json.dumps(dict(runId=manifest['runId'], attemptId=attempt, statePath=str(state_path))), flush=True)
    def progress(phase):
        state['phase'] = phase
        state_path.write_text(json.dumps(state, indent=2), encoding='utf-8')
        print('Fase: ' + phase, flush=True)
    def invoke(phase, interactive=False, content=None):
        command = remote(LOAD, attempt, checksum, phase, manifest['runId'], inspected['inspectionId'], digest, sudo=interactive)
        return transport(Step(phase, command, interactive=interactive, data=content))
    try:
        progress('public-helper-staging')
        code, output = transport(Step('staged', remote(STAGE_HELPERS, attempt, checksum), data=helpers))
        if code or json.loads(output).get('runId') != attempt:
            raise ValueError('helper-staging-failed')
        progress('existing-resources-and-prepare')
        code, _ = invoke('prepare', interactive=True)
        prepared, _ = fetch(root, manifest['runId'], 'recovery-' + attempt + '-prepare.json')
        if code or prepared.get('status') != 'prepared' or prepared.get('attemptId') != attempt or prepared.get('bootId') != inspected['bootId']:
            raise ValueError('recovery-prepare-failed')
        progress('stable-secrets-receive')
        code, output = invoke('receive', content=data)
        value = json.loads(output) if not code else {}
        if (code or value.get('runId') != manifest['runId'] or value.get('phase') != 'received'
                or value.get('consumer') != 'preview-servers'):
            raise ValueError('secret-receipt-invalid')
        progress('original-server-start-and-readiness')
        code, _ = invoke('activate', interactive=True)
        result, path = fetch(root, manifest['runId'], 'recovery-' + attempt + '-activate.json')
        if code or result.get('status') != 'passed' or result.get('attemptId') != attempt:
            raise ValueError('recovery-incomplete-review-report')
        progress('public-helper-removal')
        code, output = transport(Step('code-removed', remote(REMOVE_HELPERS, attempt)))
        if code or json.loads(output).get('phase') != 'code-removed':
            raise ValueError('public-helper-cleanup-failed')
        state['status'] = 'passed'
        progress('finished')
        return dict(runId=manifest['runId'], attemptId=attempt, status='passed', reportPath=str(path),
            meilisearchAddress=result['meilisearchAddress'], servicesStarted=True, originalVolumesReused=True,
            applicationServicesStarted=False, publishedPorts=False, isolationAccepted=False)
    except Exception:
        state['status'] = 'failed'
        state_path.write_text(json.dumps(state, indent=2), encoding='utf-8')
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--inspection-id', required=True)
    parser.add_argument('--configuration', type=Path, default=Path.home() / '.mercurion/preview/configuration.json')
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    try:
        import re
        if not re.fullmatch('[a-f0-9]{32}', args.inspection_id):
            raise ValueError('inspection-id')
        root = args.bundle.resolve()
        manifest = bundle.verify(root)
        inspected = inspection(root, manifest, args.inspection_id)
        if args.execute:
            print(json.dumps(execute(root, manifest, inspected, args.configuration)))
        else:
            print(json.dumps(dict(status='cold-recovery-plan', runId=manifest['runId'], inspectionId=args.inspection_id,
                sshStarted=False, privateConfigurationRead=False, servicesStarted=False)))
    except Exception:
        print(json.dumps(dict(code='PREVIEW_COLD_RECOVERY_FAILED',
            detail='Preserve attempt id, phase and receipts; do not retry bootstrap or regenerate credentials')), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
