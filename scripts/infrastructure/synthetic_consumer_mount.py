"""Root guest fixture lifecycle; only verified source assets and a fresh synthetic run."""
import argparse
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import uuid

IMAGE='sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
LABEL='mercurion.consumer-check.attempt'


def docker(*args,timeout=20):
    env={key:value for key,value in os.environ.items() if key not in ('DOCKER_HOST','DOCKER_CONTEXT')}
    return subprocess.run(['docker','--host','unix:///var/run/docker.sock',*args],env=env,
        check=True,capture_output=True,text=True,timeout=timeout).stdout.strip()


class Runner:
    def __init__(self,delivery,identifier,reader,probe,invoke=docker):
        self.delivery,self.identifier,self.reader,self.probe,self.invoke=delivery,identifier,reader,probe,invoke
        self.attempt=uuid.uuid4().hex
        self.run=delivery.BASE/identifier
        self.assets=self.run/'consumer-fixture'
        self.secret=self.run/'active/bootstrap.json'
        self.owned=set()
        self.removed=[]
        self.cleanup_errors=[]

    def signature(self):
        value=self.delivery.metadata_file(None,self.secret,10021,10021,0o400)
        info=os.lstat(self.secret)
        return value+(info.st_mtime_ns,info.st_ctime_ns)

    def remove(self,identifier):
        if self.invoke('inspect','--format','{{index .Config.Labels "'+LABEL+'"}}',identifier)!=self.attempt:
            raise ValueError('ownership')
        self.invoke('rm','--force',identifier)
        self.owned.discard(identifier)
        self.removed.append(identifier)

    def create(self,case,uid=10021,secret=True):
        args=['create','--pull','never','--network','none','--read-only','--user',f'{uid}:{uid}',
            '--cap-drop','ALL','--security-opt','no-new-privileges=true','--memory','64m','--cpus','0.25',
            '--pids-limit','32','--label',LABEL+'='+self.attempt,
            '--mount',f'type=bind,source={self.assets},target=/fixture,readonly']
        if secret:
            args+=['--mount',f'type=bind,source={self.secret},target=/run/bootstrap.json,readonly']
        args+=['--entrypoint','python',IMAGE,'-I','-B','/fixture/probe.py','--run-id',self.identifier,'--case',case]
        identifier=self.invoke(*args)
        if not re.fullmatch('[a-f0-9]{64}',identifier):
            raise ValueError('container-id')
        self.owned.add(identifier)
        template=('{"image":{{json .Image}},"requestedImage":{{json .Config.Image}},"user":{{json .Config.User}},'
            '"readonly":{{json .HostConfig.ReadonlyRootfs}},"network":{{json .HostConfig.NetworkMode}},'
            '"ports":{{json .HostConfig.PortBindings}},"privileged":{{json .HostConfig.Privileged}},'
            '"capDrop":{{json .HostConfig.CapDrop}},"capAdd":{{json .HostConfig.CapAdd}},'
            '"security":{{json .HostConfig.SecurityOpt}},"mounts":{{json .Mounts}}}')
        actual=json.loads(self.invoke('inspect','--format',template,identifier))
        expected={'/fixture':str(self.assets)}
        if secret:
            expected['/run/bootstrap.json']=str(self.secret)
        mounts=actual['mounts']
        if (actual['image']!=IMAGE or actual['requestedImage']!=IMAGE or actual['user']!=f'{uid}:{uid}'
                or actual['readonly'] is not True or actual['network']!='none' or actual['ports']
                or actual['privileged'] is not False or actual['capDrop']!=['ALL'] or actual['capAdd']
                or 'no-new-privileges=true' not in actual['security'] or len(mounts)!=len(expected)
                or {m['Destination']:m['Source'] for m in mounts}!=expected
                or any(m['Type']!='bind' or m['RW'] is not False for m in mounts)):
            raise ValueError('fixture-config')
        return identifier

    def result(self,output,case,uid):
        value=json.loads(output)
        fields={'schemaVersion','runId','case','uid','invocationId','outcome'}
        expected='loaded-readonly' if case=='read' else 'blocked'
        if (not isinstance(value,dict) or set(value)!=fields or type(value['schemaVersion']) is not int or value['schemaVersion']!=1
                or value['runId']!=self.identifier or value['case']!=case or value['uid']!=uid
                or not re.fullmatch('[a-f0-9]{32}',value['invocationId']) or value['outcome']!=expected):
            raise ValueError('consumer-receipt')
        return value

    def start(self,identifier,case,uid):
        output=self.invoke('start','--attach',identifier)
        if self.invoke('inspect','--format','{{.State.ExitCode}}',identifier)!='0':
            raise ValueError('consumer-exit')
        return self.result(output,case,uid)

    def run_checks(self,environment,owner):
        d=self.delivery
        report=dict(schemaVersion=1,runId=self.identifier,environment='preview',consumer='tox21',
            phase='consumer-verified',status='invalid',attemptId=self.attempt,checks=[],cleanupErrors=self.cleanup_errors,
            removedContainers=self.removed,assetsRemoved=False,
            readerSha256=hashlib.sha256(self.reader).hexdigest(),probeSha256=hashlib.sha256(self.probe).hexdigest(),
            imageId=IMAGE,syntheticOnly=True,realServicesStarted=False,isolationAccepted=False)
        created_assets=False
        try:
            if environment!='preview' or d.reconcile(self.identifier,environment,owner)!='active':
                raise ValueError('active-preview-required')
            d.no_consumer_mounts(self.identifier,self.invoke)
            image=json.loads(self.invoke('image','inspect',IMAGE))[0]
            if (image['Id'],image['Os'],image['Architecture'])!=(IMAGE,'linux','amd64'):
                raise ValueError('local-image')
            before=self.signature()
            self.assets.mkdir(mode=0o700)
            created_assets=True
            with d.directory(self.assets,0,0o700) as assets:
                d.create_file(assets,'secret_bootstrap.py',self.reader,mode=0o444)
                d.create_file(assets,'probe.py',self.probe,mode=0o444)
                os.fchmod(assets,0o555)
            first=self.create('read')
            initial=self.start(first,'read',10021)
            report['checks'].append(dict(case='initial',containerId=first,result=initial))
            self.invoke('restart','--timeout','2',first)
            if self.invoke('wait',first)!='0':
                raise ValueError('restart-exit')
            logs=self.invoke('logs',first).splitlines()
            if len(logs)!=2:
                raise ValueError('restart-logs')
            restarted=self.result(logs[-1],'read',10021)
            if restarted['invocationId']==initial['invocationId']:
                raise ValueError('restart-not-observed')
            report['checks'].append(dict(case='restart',containerId=first,result=restarted))
            self.remove(first)
            second=self.create('read')
            if first==second:
                raise ValueError('recreate-id')
            report['checks'].append(dict(case='recreate',containerId=second,result=self.start(second,'read',10021)))
            for case,uid,mount in (('unauthorized',65534,True),('missing',10021,False),('wrong-environment',10021,True)):
                identifier=self.create(case,uid,mount)
                report['checks'].append(dict(case=case,containerId=identifier,result=self.start(identifier,case,uid)))
            if self.signature()!=before:
                raise ValueError('source-changed')
            report['status']='passed'
        except (Exception,KeyboardInterrupt) as error:
            report['errorType']=type(error).__name__
        finally:
            try:
                self.owned.update(self.invoke('ps','-a','--no-trunc','--filter','label='+LABEL+'='+self.attempt,'--format','{{.ID}}').splitlines())
                for identifier in list(self.owned):
                    if not re.fullmatch('[a-f0-9]{64}',identifier):
                        raise ValueError('cleanup-id')
                    self.remove(identifier)
                if self.invoke('ps','-a','--filter','label='+LABEL+'='+self.attempt,'--format','{{.ID}}'):
                    raise ValueError('cleanup-readback')
            except Exception as error:
                self.cleanup_errors.append(type(error).__name__)
            if created_assets and not self.cleanup_errors:
                try:
                    with d.directory(self.assets,0,0o555) as assets:
                        names=set(os.listdir(assets))
                        if not names.issubset({'secret_bootstrap.py','probe.py'}):
                            raise ValueError('asset-shape')
                        for name in names:
                            d.metadata_file(assets,name,0,0,0o444)
                            os.unlink(name,dir_fd=assets)
                    self.assets.rmdir()
                    report['assetsRemoved']=True
                except Exception as error:
                    self.cleanup_errors.append(type(error).__name__)
            if self.cleanup_errors:
                report['status']='invalid'
        if report['status']=='passed':
            try:
                report['retirementState']=d.retire(self.identifier,environment,owner,
                    check_mounts=lambda run:d.no_consumer_mounts(run,self.invoke))
                if report['retirementState']!='retired':
                    raise ValueError('retirement')
            except Exception as error:
                report['status']='invalid'
                report['errorType']=type(error).__name__
        report['finishedAtUtc']=datetime.now(timezone.utc).isoformat()
        return report


def report_directory(owner,identifier):
    import pwd
    account=pwd.getpwnam(owner)
    return account,Path(account.pw_dir)/'.mercurion-infra'/('delivery-'+identifier)


def main(delivery,reader,probe):
    import pwd
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=('consumer-check','consumer-result'))
    parser.add_argument('--run-id',required=True)
    parser.add_argument('--environment',choices=('preview',))
    parser.add_argument('--owner')
    args=parser.parse_args()
    try:
        delivery.run_id(args.run_id)
        if args.command=='consumer-check':
            delivery.runtime_guard(True)
            account,folder=report_directory(args.owner,args.run_id)
            result=Runner(delivery,args.run_id,reader,probe).run_checks(args.environment,args.owner)
            with delivery.directory(folder,account.pw_uid,0o700) as parent:
                delivery.create_file(parent,'consumer-result.json',delivery.encode(result),account.pw_uid,account.pw_gid)
            print(json.dumps(dict(runId=args.run_id,status=result['status'],checkCount=len(result['checks']),
                                  realServicesStarted=False,isolationAccepted=False)),flush=True)
            return 0 if result['status']=='passed' else 2
        delivery.runtime_guard(False)
        account,folder=report_directory(pwd.getpwuid(os.geteuid()).pw_name,args.run_id)
        with delivery.directory(folder,account.pw_uid,0o700) as parent:
            result=delivery.decode(delivery.read_file(parent,'consumer-result.json',account.pw_uid))
            if (result['status']!='passed' or result['runId']!=args.run_id or len(result['checks'])!=6
                    or delivery.inspect_retired(args.run_id)!='retired' or result['cleanupErrors']):
                raise ValueError('result')
            os.unlink('consumer-result.json',dir_fd=parent)
        print(json.dumps(result))
        return 0
    except (OSError,ValueError,KeyError,TypeError):
        print(json.dumps(dict(code='SYNTHETIC_CONSUMER_CHECK_FAILED')),file=__import__('sys').stderr)
        return 2
