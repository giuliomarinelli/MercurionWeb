"""Owner-operated chunk upload and journaled import; private keys stay on the guest."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

from synthetic_secret_delivery import Step,COMMON,STAGE,remote,transport,ssh_arguments

ROOT=Path(__file__).resolve().parents[2]
INDEX_LAUNCH=r'''
import hashlib,json,os,pathlib,pwd,re,stat,subprocess,sys,time
rid,staging,digest,resume=sys.argv[1:]
assert os.geteuid()==0 and all(re.fullmatch('[a-f0-9]{32}',v) for v in (rid,staging))
assert re.fullmatch('[a-f0-9]{64}',digest) and resume in ('yes','no')
owner=pwd.getpwnam(os.environ['SUDO_USER']);assert owner.pw_uid>0
source=pathlib.Path(owner.pw_dir)/'.mercurion-infra'/('delivery-'+staging)
for parent in (source.parent,source):
 info=parent.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
fd=os.open(source/'secret_delivery.py',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
with os.fdopen(fd,'rb') as stream:
 info=os.fstat(stream.fileno());assert stat.S_ISREG(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o600
 body=stream.read(131073)
assert len(body)<=131072 and hashlib.sha256(body).hexdigest()==digest
root=pathlib.Path('/opt/mercurion/imports')/('embeddings-'+rid)
for parent in (root,*root.parents):
 info=parent.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
manifest=json.loads((root/'manifest.json').read_text());prior=json.loads((root/'import-result.json').read_text())
assert manifest['runId']==rid and prior['status']=='passed' and prior['datasetSha256']==manifest['datasetSha256']
for mode in ('import','index'):
 if mode=='import':continue # Its passed receipt is authoritative; PIDs from before reboot may be reused.
 pidfile=root/(mode+'-pid.json')
 if pidfile.exists():
  try:os.kill(json.loads(pidfile.read_text())['pid'],0)
  except ProcessLookupError:pass
  else:raise SystemExit('Embedding worker already running; use -Status')
report=root/'index-result.json'
if report.exists():
 if json.loads(report.read_text()).get('status')=='passed':print(report.read_text());raise SystemExit(0)
 assert resume=='yes','Review report before explicit -Resume'
 report.rename(root/('index-result.previous-'+str(time.time_ns())+'.json'))
worker=root/('index-worker-'+digest+'.py')
if worker.exists():
 info=worker.lstat();assert stat.S_ISREG(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
 assert worker.read_bytes()==body
else:
 fd=os.open(worker,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb') as stream:stream.write(body)
with (root/'index-worker.log').open('ab') as log:
 process=subprocess.Popen(['python3','-I',str(worker),'--root',str(root)],stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
(root/'index-pid.json').write_text(json.dumps(dict(pid=process.pid,workerSha256=digest)))
print(json.dumps(dict(status='started',runId=rid,mode='index',pid=process.pid,workerSha256=digest,reportPath=str(report))))
'''
STAGE=r'''
import hashlib,json,os,pathlib,pwd,re,stat,sys
rid,digest=sys.argv[1:]
assert re.fullmatch('[a-f0-9]{32}',rid) and re.fullmatch('[a-f0-9]{64}',digest)
owner=pwd.getpwuid(os.geteuid());assert owner.pw_uid>0
base=pathlib.Path(owner.pw_dir)/'.mercurion-embeddings'
base.mkdir(mode=0o700,exist_ok=True)
info=base.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
run=base/rid;run.mkdir(mode=0o700,exist_ok=True)
info=run.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
(run/'chunks').mkdir(mode=0o700,exist_ok=True)
raw=sys.stdin.buffer.read(131073);assert len(raw)<=131072 and hashlib.sha256(raw).hexdigest()==digest
path=run/'helpers.json'
if path.exists():assert path.read_bytes()==raw
else:
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb') as stream:stream.write(raw)
value=json.loads(raw)
missing=[]
for item in value['manifest']['dataset']['files']:
 name=item['name'];assert re.fullmatch(r'molecule_embeddings-[0-9]{3}\.sql',name)
 target=run/'chunks'/name
 if target.exists():
  assert target.is_file() and not target.is_symlink()
  h=hashlib.sha256()
  with target.open('rb') as stream:
   for block in iter(lambda:stream.read(4194304),b''):h.update(block)
  if target.stat().st_size==item['bytes'] and h.hexdigest()==item['sha256']:continue
 missing.append(name)
print(json.dumps(dict(runId=rid,missing=missing)))
'''
LAUNCH=r'''
import hashlib,json,os,pathlib,pwd,re,stat,subprocess,sys,time
rid,digest,mode,resume=sys.argv[1:]
assert os.geteuid()==0 and re.fullmatch('[a-f0-9]{32}',rid) and mode in ('import','index') and resume in ('yes','no')
owner=pwd.getpwnam(os.environ['SUDO_USER'])
source=pathlib.Path(owner.pw_dir)/'.mercurion-embeddings'/rid
for path in (source.parent,source,source/'chunks'):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid and stat.S_IMODE(info.st_mode)==0o700
fd=os.open(source/'helpers.json',os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
with os.fdopen(fd,'rb') as stream:
 info=os.fstat(stream.fileno());assert stat.S_ISREG(info.st_mode) and info.st_uid==owner.pw_uid
 raw=stream.read(131073)
assert len(raw)<=131072 and hashlib.sha256(raw).hexdigest()==digest
value=json.loads(raw);manifest=value['manifest'];assert manifest['runId']==rid
parent=pathlib.Path('/opt/mercurion/imports');parent.mkdir(mode=0o755,exist_ok=True)
for path in (parent,*parent.parents):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
root=parent/('embeddings-'+rid)
if not root.exists():
 assert mode=='import'
 root.mkdir(mode=0o700)
 manifest['chunkDirectory']=str(source/'chunks')
 (root/'manifest.json').write_text(json.dumps(manifest));(root/'manifest.json').chmod(0o600)
 assert set(value['files'])=={'guest_embedding_import.py','embedding_dump_inventory.py','guest_preview_recovery_inventory.py','10_table.sql','30_indexes.sql','90_verify.sql'}
 for name,body in value['files'].items():
  (root/name).write_text(body);(root/name).chmod(0o600)
else:
 info=root.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and stat.S_IMODE(info.st_mode)==0o700
 previous=json.loads((root/'manifest.json').read_text());assert previous['datasetSha256']==manifest['datasetSha256']
 for name,body in value['files'].items():assert (root/name).read_text()==body
pidfile=root/(mode+'-pid.json');report=root/(mode+'-result.json')
if pidfile.exists():
 pid=json.loads(pidfile.read_text())['pid']
 try:os.kill(pid,0);running=True
 except ProcessLookupError:running=False
 if running:raise SystemExit('Import/index process already running; use -Status')
 if report.exists() and json.loads(report.read_text()).get('status')=='passed':
  print(report.read_text());raise SystemExit(0)
 assert resume=='yes','Use explicit -Resume after reviewing the previous report'
 if report.exists():report.rename(root/(report.name+'.previous-'+str(time.time_ns())))
with (root/(mode+'-worker.log')).open('ab') as log:
 process=subprocess.Popen(['python3','-I',str(root/'guest_embedding_import.py'),'--root',str(root),'--mode',mode],
    stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
pidfile.write_text(json.dumps(dict(pid=process.pid)))
print(json.dumps(dict(status='started',runId=rid,mode=mode,pid=process.pid,reportPath=str(report))))
'''
STATUS=r'''
import json,os,pathlib,re,sys
rid,mode=sys.argv[1:];assert re.fullmatch('[a-f0-9]{32}',rid) and mode in ('import','index') and os.geteuid()==0
root=pathlib.Path('/opt/mercurion/imports')/('embeddings-'+rid)
report=root/(mode+'-result.json')
if report.exists():
 result=json.loads(report.read_text())
else:result=dict(status='starting',runId=rid,mode=mode)
pidfile=root/(mode+'-pid.json')
running=False
if pidfile.exists():
 pid=json.loads(pidfile.read_text())['pid']
 try:os.kill(pid,0);running=True
 except ProcessLookupError:pass
result['workerRunning']=running
if mode=='index' and running and result.get('containerId'):
 import subprocess
 cid=result['containerId'];assert re.fullmatch('[a-f0-9]{64}',cid)
 command='export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec psql -XqAt -h 127.0.0.1 -U mercurion_preview -d mercurion_preview -c "SELECT coalesce(json_agg(row_to_json(p)),\'[]\') FROM (SELECT phase,tuples_done,tuples_total FROM pg_stat_progress_create_index) p"'
 value=subprocess.run(['docker','--host','unix:///var/run/docker.sock','exec',cid,'sh','-c',command],capture_output=True,text=True,timeout=15)
 if value.returncode==0:
  try:result['indexProgress']=json.loads(value.stdout)
  except ValueError:pass
print(json.dumps(result))
'''


def prepare(manifest_path,upgrade_path,output):
    dataset=json.loads(manifest_path.read_text())
    upgraded=json.loads((upgrade_path/'upgrade-result.json').read_text())
    baseline=json.loads((upgrade_path/'upgrade-manifest.json').read_text())
    if upgraded.get('status')!='passed' or dataset['format']!='psql-copy-seven-columns-v1':raise ValueError('successful-upgrade-and-validated-dump-required')
    output.mkdir(parents=True,exist_ok=False)
    manifest=dict(schemaVersion=1,runId=uuid.uuid4().hex,dataset=dataset,
                  datasetSha256=hashlib.sha256(json.dumps(dataset,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
                  serverRunId=baseline['serverRunId'],serverManifestSha256=baseline['serverManifestSha256'],upgradeId=baseline['upgradeId'])
    files={name:(ROOT/'scripts/infrastructure'/name).read_text(encoding='utf-8') for name in
           ('guest_embedding_import.py','embedding_dump_inventory.py','guest_preview_recovery_inventory.py')}
    files.update({name:(ROOT/'MercurionWebNode/sql/bootstrap/embeddings'/name).read_text(encoding='utf-8') for name in
                  ('10_table.sql','30_indexes.sql','90_verify.sql')})
    payload=json.dumps(dict(manifest=manifest,files=files),separators=(',',':')).encode()
    if len(payload)>131072:raise ValueError('embedding-helper-bundle-too-large')
    (output/'helpers.json').write_bytes(payload)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2))
    return manifest


def execute(root,mode,resume=False,status=False):
    manifest=json.loads((root/'manifest.json').read_text())
    rid=manifest['runId'];payload=(root/'helpers.json').read_bytes();digest=hashlib.sha256(payload).hexdigest()
    if status:
        code,_=transport(Step('status',remote(STATUS,rid,mode,sudo=True),interactive=True))
        return code
    if os.name!='nt':raise ValueError('owner-windows-terminal-required')
    if mode=='index':
        # The completed import bundle is immutable; install a separately pinned maintenance worker.
        source=(ROOT/'scripts/infrastructure/guest_embedding_index.py').read_bytes()
        digest=hashlib.sha256(source).hexdigest();staging=uuid.uuid4().hex
        code,_=transport(Step('index-worker-staging',remote(STAGE,staging,digest),data=source))
        if code:raise ValueError('embedding-index-worker-staging-failed')
        script=remote(INDEX_LAUNCH,rid,staging,digest,'yes' if resume else 'no',sudo=True)
        return subprocess.run(ssh_arguments(Step('index-launch',script,interactive=True))).returncode
    if mode=='import':
        code,raw=transport(Step('prepare-upload',remote(STAGE,rid,digest),data=payload))
        if code:raise ValueError('embedding-upload-preparation-failed')
        missing=json.loads(raw)['missing']
        source=Path(manifest['dataset']['sourceDirectory'])
        allowed={r['name'] for r in manifest['dataset']['files']}
        if not set(missing)<=allowed:raise ValueError('embedding-upload-plan-mismatch')
        if missing:
            command=['scp.exe',*COMMON,*[str(source/name) for name in missing],
                     'mercurion-server:.mercurion-embeddings/'+rid+'/chunks/']
            if subprocess.run(command).returncode:raise ValueError('embedding-upload-failed-resume-skips-verified-files')
    script=remote(LAUNCH,rid,digest,mode,'yes' if resume else 'no',sudo=True)
    return subprocess.run(ssh_arguments(Step('launch',script,interactive=True))).returncode


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    commands=parser.add_subparsers(dest='command',required=True)
    prep=commands.add_parser('prepare')
    for name in ('manifest','upgrade','output'):prep.add_argument('--'+name,required=True,type=Path)
    invoke=commands.add_parser('execute')
    invoke.add_argument('--root',required=True,type=Path)
    invoke.add_argument('--mode',choices=('import','index'),default='import')
    invoke.add_argument('--resume',action='store_true');invoke.add_argument('--status',action='store_true')
    args=parser.parse_args()
    if args.command=='prepare':
        manifest=prepare(args.manifest,args.upgrade,args.output)
        print(json.dumps(dict(status='prepared',runId=manifest['runId'],rows=manifest['dataset']['rowCount'],bytes=manifest['dataset']['bytes'])))
    else:raise SystemExit(execute(args.root.resolve(),args.mode,args.resume,args.status))
