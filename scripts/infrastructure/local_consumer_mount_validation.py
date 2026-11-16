"""Actual Docker Desktop bind/UID/restart fixture check; no SSH or application services."""
import base64
import hashlib
import json
import os
from pathlib import Path,PurePosixPath
import subprocess
import time
from types import SimpleNamespace
import uuid

from synthetic_consumer_host import build_plan
from synthetic_consumer_mount import IMAGE,LABEL,Runner

LOCAL_LABEL='mercurion.consumer-local-run'
PREPARE=r'''
import base64,json,os,pathlib,sys,time,uuid
rid,reader,probe=sys.argv[1:]
root=pathlib.Path('/data')
code=root/'code'; code.mkdir(mode=0o755)
for name,data in [('secret_bootstrap.py',reader),('probe.py',probe)]:
 p=code/name; p.write_bytes(base64.b64decode(data)); p.chmod(0o444)
payload=dict(schemaVersion=1,environment='staging',variables=dict(NATS_USERNAME='synthetic-tox21-'+rid,NATS_PASSWORD='synthetic-only-'+uuid.uuid4().hex))
p=root/'bootstrap.json'; p.write_text(json.dumps(payload)); os.chown(p,10021,10021); p.chmod(0o400)
print(json.dumps(dict(ready=True,runId=rid)),flush=True)
time.sleep(300)
'''


def invoke(*args,timeout=20):
    env={k:v for k,v in os.environ.items() if k not in ('DOCKER_HOST','DOCKER_CONTEXT')}
    return subprocess.run(['docker','--context','desktop-linux',*args],env=env,check=True,
        capture_output=True,text=True,timeout=timeout).stdout.strip()


def main():
    plan=build_plan()  # Also proves the current source bundle fits the transport bound.
    folder=Path(__file__).resolve().parent
    reader=folder.parents[1].parent/'MercurionTox21/secret_bootstrap.py'
    identifier=uuid.uuid4().hex
    root=Path.home()/'.codex/artifacts/inf-vm-04/local-validation'/identifier
    root.mkdir(parents=True,exist_ok=False)
    path=root/'consumer-mount.json'
    volume='mercurion-consumer-local-'+identifier
    keeper=None
    volume_created=False
    runner=Runner(SimpleNamespace(BASE=Path('/synthetic-local-only')),identifier,b'',b'',invoke)
    result=dict(schemaVersion=1,runId=identifier,scope='Local Docker Desktop fixture only',status='invalid',
                checks=[],cleanupErrors=[],readerSha256=plan.reader_sha256,probeSha256=plan.probe_sha256,
                realServicesStarted=False,isolationAccepted=False)
    try:
        image=json.loads(invoke('image','inspect',IMAGE))[0]
        if (image['Id'],image['Os'],image['Architecture'])!=(IMAGE,'linux','amd64'):
            raise ValueError('local-image')
        invoke('volume','create','--driver','local','--opt','type=tmpfs','--opt','device=tmpfs',
               '--opt','o=size=8m,mode=0755','--label',LOCAL_LABEL+'='+identifier,volume)
        volume_created=True
        mount=invoke('volume','inspect','--format','{{.Mountpoint}}',volume)
        keeper=invoke('create','--pull','never','--network','none','--read-only','--cap-drop','ALL',
            '--cap-add','CHOWN','--cap-add','FOWNER','--cap-add','DAC_OVERRIDE',
            '--security-opt','no-new-privileges=true','--memory','64m','--cpus','0.25','--pids-limit','32',
            '--label',LOCAL_LABEL+'='+identifier,'--mount',f'type=volume,source={volume},target=/data',
            '--entrypoint','python',IMAGE,'-I','-B','-c',PREPARE,identifier,
            base64.b64encode(reader.read_bytes()).decode(),
            base64.b64encode((folder/'synthetic_consumer_probe.py').read_bytes()).decode())
        invoke('start',keeper)
        deadline=time.monotonic()+15
        while not invoke('logs',keeper):
            if time.monotonic()>deadline:
                raise TimeoutError('setup')
            time.sleep(0.1)
        if json.loads(invoke('logs',keeper))!=dict(ready=True,runId=identifier):
            raise ValueError('setup')
        runner.assets=PurePosixPath(mount)/'code'
        runner.secret=PurePosixPath(mount)/'bootstrap.json'
        first=runner.create('read')
        initial=runner.start(first,'read',10021)
        result['checks'].append(dict(case='initial',containerId=first,result=initial))
        invoke('restart','--timeout','2',first)
        if invoke('wait',first)!='0':
            raise ValueError('restart')
        logs=invoke('logs',first).splitlines()
        if len(logs)!=2:
            raise ValueError('restart-logs')
        restarted=runner.result(logs[-1],'read',10021)
        if restarted['invocationId']==initial['invocationId']:
            raise ValueError('restart-not-observed')
        result['checks'].append(dict(case='restart',containerId=first,result=restarted))
        runner.remove(first)
        second=runner.create('read')
        if second==first:
            raise ValueError('recreate')
        result['checks'].append(dict(case='recreate',containerId=second,result=runner.start(second,'read',10021)))
        for case,uid,secret in (('unauthorized',65534,True),('missing',10021,False),('wrong-environment',10021,True)):
            cid=runner.create(case,uid,secret)
            result['checks'].append(dict(case=case,containerId=cid,result=runner.start(cid,case,uid)))
        result['status']='passed'
    except Exception as error:
        result['errorType']=type(error).__name__
        if isinstance(error,subprocess.CalledProcessError):
            result['failedDockerOperation']=error.cmd[3]  # No argv, output or credential contents.
    finally:
        try:
            runner.owned.update(invoke('ps','-a','--no-trunc','--filter','label='+LABEL+'='+runner.attempt,'--format','{{.ID}}').splitlines())
            for cid in list(runner.owned):
                runner.remove(cid)
            result['consumerContainersRemoved']=len(runner.removed)
        except Exception as error:
            result['cleanupErrors'].append(type(error).__name__)
        if keeper:
            try:
                if invoke('inspect','--format','{{index .Config.Labels "'+LOCAL_LABEL+'"}}',keeper)!=identifier:
                    raise ValueError('keeper-owner')
                invoke('rm','--force',keeper)
            except Exception as error:
                result['cleanupErrors'].append(type(error).__name__)
        if volume_created:
            try:
                if invoke('volume','inspect','--format','{{index .Labels "'+LOCAL_LABEL+'"}}',volume)!=identifier:
                    raise ValueError('volume-owner')
                invoke('volume','rm',volume)
            except Exception as error:
                result['cleanupErrors'].append(type(error).__name__)
        if result['cleanupErrors']:
            result['status']='invalid'
        with path.open('x',encoding='utf-8') as output:
            json.dump(result,output,indent=2)
    print(json.dumps(dict(runId=identifier,status=result['status'],checkCount=len(result['checks']),
        cleanupErrors=result['cleanupErrors'],reportPath=str(path),sha256=hashlib.sha256(path.read_bytes()).hexdigest())))
    return 0 if result['status']=='passed' else 2


if __name__=='__main__':
    raise SystemExit(main())
