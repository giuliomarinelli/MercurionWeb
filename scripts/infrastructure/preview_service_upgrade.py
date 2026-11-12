"""Owner-operated delivery and adoption; private configuration stays on the guest."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

import preview_service_upgrade_bundle as bundle
from synthetic_secret_delivery import Step,COMMON,remote,ssh_arguments

COPY=r'''
import hashlib,json,os,pathlib,pwd,re,signal,stat,sys
uid,digest=sys.argv[1:]
assert os.geteuid()==0 and re.fullmatch('[a-f0-9]{32}',uid) and re.fullmatch('[a-f0-9]{64}',digest)
owner=pwd.getpwnam(os.environ['SUDO_USER']);assert owner.pw_uid>0
source=pathlib.Path(owner.pw_dir)/('vm047-upgrade-'+uid)
def regular(path):
 for parent in (path.parent,*path.parent.parents):
  if parent==source.parent:break
  info=parent.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==owner.pw_uid
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 stream=os.fdopen(fd,'rb');info=os.fstat(stream.fileno())
 assert stat.S_ISREG(info.st_mode) and info.st_uid==owner.pw_uid
 return stream
with regular(source/'upgrade-manifest.json') as stream:raw=stream.read(1048577)
assert len(raw)<=1048576 and hashlib.sha256(raw).hexdigest()==digest
manifest=json.loads(raw);assert manifest['upgradeId']==uid and set(manifest['files'])==EXPECTED_FILES
parent=pathlib.Path('/opt/mercurion/releases')
for path in (parent,*parent.parents):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
root=parent/('upgrade-'+uid);root.mkdir(mode=0o700)
for name,wanted in manifest['files'].items():
 target=root/name;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
 fd=os.open(target,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o644)
 checksum=hashlib.sha256()
 with regular(source/name) as origin,os.fdopen(fd,'wb') as destination:
  for data in iter(lambda:origin.read(1048576),b''):checksum.update(data);destination.write(data)
 assert checksum.hexdigest()==wanted
(root/'upgrade-manifest.json').write_bytes(raw);root.chmod(0o755)
sys.path.insert(0,str(root/'scripts/infrastructure'))
import preview_service_upgrade_bundle as bundle
import guest_preview_service_upgrade as operation
signal.signal(signal.SIGHUP,signal.SIG_IGN)
try:
 bundle.verify(root)
 operation.write(root/'execution-reserved.json',{'upgradeId':uid},0o644)
 result=operation.execute(root,manifest)
except Exception as error:
 result=dict(upgradeId=uid,status='failed',phase='preflight',rollback='not-needed',errorType=type(error).__name__)
 if isinstance(error,ValueError) and re.fullmatch('[a-z0-9-]+',str(error)):result['code']=str(error)
 if not (root/'upgrade-result.json').exists():operation.write(root/'upgrade-result.json',result,0o644)
 print(json.dumps(result))
raise SystemExit(0 if result['status']=='passed' else 1)
'''


def execute(root,manifest):
    if os.name!='nt':raise ValueError('windows-owner-terminal-required')
    marker=root/'owner-execution.json'
    with marker.open('x') as stream:json.dump(dict(upgradeId=manifest['upgradeId'],status='started'),stream)
    uid=manifest['upgradeId']
    print(json.dumps(dict(upgradeId=uid,phase='public-transfer',configurationRead=False)),flush=True)
    result=subprocess.run(['scp.exe',*COMMON,'-r',str(root),'mercurion-server:vm047-upgrade-'+uid],timeout=600)
    if result.returncode:raise ValueError('upgrade-public-transfer-failed')
    script='EXPECTED_FILES=set('+repr(sorted(manifest['files']))+')\n'+COPY
    # The guest owns bounded phases and rollback. Do not kill the whole update
    # after the generic short secret-delivery timeout while a restore is in progress.
    step=Step('adopt-upgrade',remote(script,uid,hashlib.sha256((root/'upgrade-manifest.json').read_bytes()).hexdigest(),sudo=True),interactive=True)
    status=subprocess.run(ssh_arguments(step),check=False).returncode
    path=root/'upgrade-result.json'
    fetched=subprocess.run(['scp.exe',*COMMON,'mercurion-server:/opt/mercurion/releases/upgrade-'+uid+'/upgrade-result.json',str(path)],timeout=180)
    if fetched.returncode:raise ValueError('upgrade-report-download-failed-do-not-rerun')
    report=json.loads(path.read_text())
    if status or report.get('status')!='passed':
        print(json.dumps(report),flush=True)
        raise ValueError('upgrade-failed-review-rollback-status')
    return dict(status='passed',upgradeId=uid,checks=report['checks'],reportPath=str(path),
                oldContainersAndVolumesRetained=True,configurationRead=False,publishedPorts=False,isolationAccepted=False)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',required=True,type=Path)
    parser.add_argument('--execute',action='store_true')
    args=parser.parse_args()
    try:
        manifest=bundle.verify(args.bundle)
        if args.execute:print(json.dumps(execute(args.bundle.resolve(),manifest)))
        else:print(json.dumps(dict(status='upgrade-plan',upgradeId=manifest['upgradeId'],images=manifest['images'],sshStarted=False)))
    except Exception as error:
        print(json.dumps(dict(status='failed',code=str(error) if isinstance(error,ValueError) else type(error).__name__,
                              detail='Preserve upgrade id and report; no repeat, reset or volume removal.')))
        raise SystemExit(1)
