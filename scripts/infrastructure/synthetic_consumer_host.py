"""Fresh synthetic delivery, read-only consumer fixture lifecycle and retirement."""
import argparse
from dataclasses import dataclass
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

import synthetic_secret_delivery as transport

IMAGE='sha256:65bd3d9f1d7fa268dd1909973ba7eb4bdf41f6dcf2cfbe76ba9528b170f3fd79'
CASES=['initial','restart','recreate','unauthorized','missing','wrong-environment']


@dataclass
class Plan(transport.Plan):
    reader_sha256: str
    probe_sha256: str


def build_plan(*,reader_path=None):
    folder=Path(__file__).resolve().parent
    paths=dict(delivery=folder/'secret_delivery.py',driver=folder/'synthetic_consumer_mount.py',
               reader=reader_path or folder.parents[1].parent/'MercurionTox21/secret_bootstrap.py',
               probe=folder/'synthetic_consumer_probe.py')
    assets={}
    for name,path in paths.items():
        if not stat.S_ISREG(path.lstat().st_mode):
            raise ValueError('source-file')
        assets[name]=path.read_bytes()
    source=("import sys,types\n"
        "d=types.ModuleType('verified_delivery')\n"
        f"exec(compile({assets['delivery']!r},'<verified-delivery>','exec'),d.__dict__)\n"
        "c=types.ModuleType('verified_consumer')\n"
        f"exec(compile({assets['driver']!r},'<verified-consumer>','exec'),c.__dict__)\n"
        "if sys.argv[1] in ('consumer-check','consumer-result'):\n"
        f" raise SystemExit(c.main(d,{assets['reader']!r},{assets['probe']!r}))\n"
        "raise SystemExit(d.main())\n").encode('utf-8')
    base=transport.build_plan('preview',helper=source)
    steps=base.steps[:-1]+[
        transport.Step('consumer-tested',transport.remote(transport.LOAD,base.run_id,base.helper_sha256,
            'consumer-check','preview',sudo=True),interactive=True),
        transport.Step('consumer-result',transport.remote(transport.LOAD,base.run_id,base.helper_sha256,
            'consumer-result','preview')),base.steps[-1]]
    return Plan(base.run_id,'preview',base.helper_sha256,steps,
                hashlib.sha256(assets['reader']).hexdigest(),hashlib.sha256(assets['probe']).hexdigest())


def validate_result(value,plan):
    fields={'schemaVersion','runId','environment','consumer','phase','status','attemptId','checks','cleanupErrors',
            'removedContainers','assetsRemoved','readerSha256','probeSha256','imageId','syntheticOnly',
            'realServicesStarted','isolationAccepted','retirementState','finishedAtUtc'}
    if (not isinstance(value,dict) or set(value)!=fields or type(value['schemaVersion']) is not int
            or value['schemaVersion']!=1 or value['runId']!=plan.run_id or value['environment']!='preview'
            or value['consumer']!='tox21' or value['phase']!='consumer-verified' or value['status']!='passed'
            or value['cleanupErrors'] or value['assetsRemoved'] is not True or value['imageId']!=IMAGE
            or value['readerSha256']!=plan.reader_sha256 or value['probeSha256']!=plan.probe_sha256
            or value['syntheticOnly'] is not True or value['realServicesStarted'] is not False
            or value['isolationAccepted'] is not False or value['retirementState']!='retired'
            or not re.fullmatch('[a-f0-9]{32}',value['attemptId'])
            or [entry['case'] for entry in value['checks']]!=CASES):
        raise ValueError('consumer-result')
    for entry in value['checks']:
        result=entry['result']
        case='read' if entry['case'] in CASES[:3] else entry['case']
        uid=65534 if case=='unauthorized' else 10021
        if (set(entry)!={'case','containerId','result'} or not re.fullmatch('[a-f0-9]{64}',entry['containerId'])
                or set(result)!={'schemaVersion','runId','case','uid','invocationId','outcome'}
                or type(result['schemaVersion']) is not int or result['schemaVersion']!=1
                or result['runId']!=plan.run_id or result['case']!=case or result['uid']!=uid
                or not re.fullmatch('[a-f0-9]{32}',result['invocationId'])
                or result['outcome']!=('loaded-readonly' if case=='read' else 'blocked')):
            raise ValueError('consumer-result')
    cases=value['checks']
    identifiers={entry['containerId'] for entry in cases}
    if (len(identifiers)!=5 or cases[0]['containerId']!=cases[1]['containerId']
            or cases[0]['result']['invocationId']==cases[1]['result']['invocationId']
            or len(value['removedContainers'])!=5 or set(value['removedContainers'])!=identifiers):
        raise ValueError('consumer-lifecycle')
    return value


def execute(plan,invoke=transport.transport,progress=None):
    initial=transport.Plan(plan.run_id,'preview',plan.helper_sha256,plan.steps[:5])
    completed=transport.execute(initial,invoke,progress)['phases']
    result=None
    for step in plan.steps[5:]:
        if progress:
            progress(step.phase)
        code,output=invoke(step)
        if code:
            raise ValueError('phase-failed')
        if step.phase=='consumer-result':
            if output is None or len(output)>16384:
                raise ValueError('consumer-result')
            result=validate_result(json.loads(output),plan)
        elif not step.interactive:
            doc=json.loads(output)
            if (doc!=dict(schemaVersion=1,runId=plan.run_id,phase='code-removed')
                    or type(doc.get('schemaVersion')) is not int):
                raise ValueError('code-receipt')
        completed.append(step.phase)
    return {**result,'bundleSha256':plan.helper_sha256,'phases':completed,'codeRemoved':True}


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute',action='store_true')
    args=parser.parse_args(argv)
    try:
        plan=build_plan()
        if not args.execute:
            print(json.dumps(dict(runId=plan.run_id,environment='preview',phases=[s.phase for s in plan.steps],
                bundleSha256=plan.helper_sha256,readerSha256=plan.reader_sha256,probeSha256=plan.probe_sha256,
                syntheticOnly=True,executionRequested=False)))
            return 0
        if os.name!='nt':
            raise ValueError('windows-host-required')
        root=Path.home()/'.codex/artifacts/inf-vm-04'/plan.run_id
        root.mkdir(parents=True,exist_ok=False)
        path=root/'consumer-mount-result.json'
        with path.open('x',encoding='utf-8') as stream:
            record=dict(schemaVersion=1,runId=plan.run_id,environment='preview',status='pending',
                        phase='not-started',syntheticOnly=True,realServicesStarted=False,isolationAccepted=False)
            def checkpoint(phase):
                record.update(phase=phase,recordedAtUtc=datetime.now(timezone.utc).isoformat())
                stream.seek(0); json.dump(record,stream,indent=2); stream.truncate(); stream.flush(); os.fsync(stream.fileno())
                print('Fase: '+phase,flush=True)
            checkpoint('prepared-host')
            print(json.dumps(dict(runId=plan.run_id,reportPath=str(path))),flush=True)
            try:
                result=execute(plan,progress=checkpoint)
                record.update(result)
                checkpoint('finished')
            except (Exception,KeyboardInterrupt) as error:
                record.update(status='invalid',errorType=type(error).__name__)
                checkpoint(record['phase'])
                raise
        print(json.dumps(dict(runId=plan.run_id,status=record['status'],checkCount=len(record['checks']),
            retirementState=record['retirementState'],codeRemoved=True,reportPath=str(path),
            realServicesStarted=False,isolationAccepted=False)))
        return 0
    except (Exception,KeyboardInterrupt):
        print(json.dumps(dict(code='SYNTHETIC_CONSUMER_PILOT_FAILED',
            detail='Preserve run and metadata report; no automatic retry')),file=sys.stderr)
        return 2


if __name__=='__main__':
    raise SystemExit(main())
