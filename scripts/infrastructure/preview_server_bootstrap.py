"""Owner-invoked Windows transport. Real values travel only over SSH stdin to guest tmpfs."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

import preview_credentials
import preview_server_bundle as bundle
import preview_server_secrets as server_secrets
from synthetic_secret_delivery import Step, COMMON, remote, transport

COPY_RELEASE = r'''
import hashlib,json,os,pathlib,pwd,stat,sys,runpy
rid,digest=sys.argv[1:]
assert len(rid)==32 and all(c in '0123456789abcdef' for c in rid)
assert os.geteuid()==0
owner=pwd.getpwnam(os.environ['SUDO_USER'])
source=pathlib.Path(owner.pw_dir)/('vm043-servers-'+rid)
def regular(path):
 for parent in (source,*path.relative_to(source).parents):
  current=parent if parent==source else source/parent
  info=current.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and not info.st_mode&0o022
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 info=os.fstat(fd);assert stat.S_ISREG(info.st_mode) and info.st_uid==owner.pw_uid and not info.st_mode&0o022
 return os.fdopen(fd,'rb')
with regular(source/'server-bootstrap.json') as stream:raw=stream.read(1048577)
assert len(raw)<=1048576 and hashlib.sha256(raw).hexdigest()==digest
manifest=json.loads(raw);assert manifest['runId']==rid and set(manifest['files'])==EXPECTED_FILES
parent=pathlib.Path('/opt/mercurion/releases')
for directory in (pathlib.Path('/opt'),parent.parent,parent):
 try:directory.mkdir(mode=0o755)
 except FileExistsError:pass
 info=directory.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
root=parent/('server-'+rid);root.mkdir(mode=0o700)
for name,wanted in manifest['files'].items():
 target=root/name;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
 fd=os.open(target,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o644)
 checksum=hashlib.sha256()
 with regular(source/name) as origin,os.fdopen(fd,'wb') as destination:
  for block in iter(lambda:origin.read(1048576),b''):checksum.update(block);destination.write(block)
 assert checksum.hexdigest()==wanted
 target.chmod(0o755 if name.endswith('/postgres-init.sh') else 0o644)
(root/'server-bootstrap.json').write_bytes(raw);(root/'server-bootstrap.json').chmod(0o644);root.chmod(0o755)
sys.path.insert(0,str(root/'scripts/infrastructure'))
script=root/'scripts/infrastructure/guest_preview_servers.py'
sys.argv=[str(script),'preflight','--root',str(root)]
runpy.run_path(str(script),run_name='__main__')
'''

ENTRY = r'''
import os,pathlib,runpy,stat,sys
rid,kind,phase=sys.argv[1:]
assert len(rid)==32 and all(c in '0123456789abcdef' for c in rid)
assert (kind,phase) in (('secrets','receive'),('servers','activate'))
root=pathlib.Path('/opt/mercurion/releases')/('server-'+rid)
for path in (root,*root.parents):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
sys.path.insert(0,str(root/'scripts/infrastructure'))
script=root/'scripts/infrastructure'/('preview_server_secrets.py' if kind=='secrets' else 'guest_preview_servers.py')
info=script.lstat();assert stat.S_ISREG(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
sys.argv=[str(script),phase]+(['--run-id',rid] if kind=='secrets' else ['--root',str(root)])
runpy.run_path(str(script),run_name='__main__')
'''


def payload(configuration, identifier):
    preview_credentials.validate(configuration, application=False)
    documents = preview_credentials.server_documents(configuration)
    value = dict(schemaVersion=1, runId=identifier, environment='preview', consumer='preview-servers',
                 documents={role: documents[role][2] for role in server_secrets.ROLES})
    data = json.dumps(value, separators=(',', ':')).encode()
    server_secrets.validate(data, identifier)
    return data


def invoke_step(step):
    code, answer = transport(step)
    if code:
        raise ValueError('ssh-phase-failed')
    return answer


def fetch(root, identifier, name):
    path = root / 'receipts' / name
    path.parent.mkdir(exist_ok=True)
    if path.exists():
        raise ValueError('receipt-already-exists')
    command = ['scp.exe', *COMMON, 'mercurion-server:/opt/mercurion/releases/server-' + identifier + '/' + name, str(path)]
    if subprocess.run(command, timeout=180).returncode:
        raise ValueError('receipt-download-failed')
    value = json.loads(path.read_text(encoding='utf-8'))
    if value.get('runId') != identifier:
        raise ValueError('receipt-identity')
    return value, path


def execute(root, configuration):
    if os.name != 'nt':
        raise ValueError('windows-owner-terminal-required')
    manifest = bundle.verify(root)
    identifier = manifest['runId']
    state_path = root / 'execution-state.json'
    if state_path.exists():
        raise ValueError('already-attempted-no-automatic-retry')
    # Owner process only. Never execute this path in the assistant's tool session.
    private = json.loads(configuration.read_text(encoding='utf-8-sig'))
    data = payload(private, identifier)
    state = dict(runId=identifier, phase='validated-host', servicesStarted=False, isolationAccepted=False)
    with state_path.open('x') as stream:
        json.dump(state, stream)
    def progress(phase):
        state['phase'] = phase
        state_path.write_text(json.dumps(state, indent=2))
        print('Fase: ' + phase, flush=True)
    try:
        progress('public-transfer')
        if subprocess.run(['scp.exe', *COMMON, '-r', str(root), 'mercurion-server:vm043-servers-' + identifier], timeout=300).returncode:
            raise ValueError('public-transfer-failed')
        progress('guest-preflight-and-load')
        script = 'EXPECTED_FILES=set(' + repr(sorted(bundle.expected_files())) + ')\n' + COPY_RELEASE
        step = Step('preflight', remote(script, identifier, bundle.delivery.checksum(root / 'server-bootstrap.json'), sudo=True), interactive=True)
        code, _ = transport(step)
        preflight, _ = fetch(root, identifier, 'preflight-result.json')
        if (code or preflight.get('status') != 'ready' or preflight.get('readyForSecretDelivery') is not True
                or preflight.get('secretInboxPrepared') is not True):
            raise ValueError('guest-preflight-failed')
        progress('secrets-receive')
        answer = invoke_step(Step('receive', remote(ENTRY, identifier, 'secrets', 'receive'), data=data))
        receipt = json.loads(answer)
        if (receipt.get('runId') != identifier or receipt.get('consumer') != 'preview-servers'
                or receipt.get('phase') != 'received' or receipt.get('servicesStarted') is not False):
            raise ValueError('secret-receipt-invalid')
        progress('server-start-and-readiness')
        code, _ = transport(Step('activate', remote(ENTRY, identifier, 'servers', 'activate', sudo=True), interactive=True))
        result, path = fetch(root, identifier, 'bootstrap-result.json')
        state['servicesStarted'] = result.get('servicesStarted', False)
        if code or result.get('status') != 'passed' or len(result.get('ownedContainers', [])) != 4:
            raise ValueError('server-start-incomplete')
        progress('finished')
        return dict(runId=identifier, status='passed', reportPath=str(path), meilisearchAddress=result['meilisearchAddress'],
                    servicesStarted=True, publishedPorts=False, applicationServicesStarted=False, isolationAccepted=False)
    except Exception:
        state['status'] = 'failed'
        state_path.write_text(json.dumps(state, indent=2))
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--configuration', type=Path, default=Path.home() / '.mercurion/preview/configuration.json')
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    try:
        value = bundle.verify(args.bundle)
        if args.execute:
            print('Bootstrap dei soli server preview: passphrase SSH e sudo soltanto nel terminale.', flush=True)
            print(json.dumps(execute(args.bundle.resolve(), args.configuration)))
        else:
            print(json.dumps(dict(runId=value['runId'], status='public-bundle-verified', executionRequested=False,
                                  privateConfigurationRead=False, serverCount=4)))
    except Exception:
        print(json.dumps(dict(code='PREVIEW_SERVER_BOOTSTRAP_FAILED',
            detail='Preserve phase, execution-state.json and receipts; no automatic retry or cleanup')), file=sys.stderr)
        raise SystemExit(1)
