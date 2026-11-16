"""Static local image review: selected source hashes only; never starts a container."""
import argparse
from datetime import datetime,timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import uuid

LABEL='mercurion.tox21-artifact-review'
SOURCES=('main.py','config.py','runtime.py','schemas/schemas.py','secret_bootstrap.py','bootstrap_secrets.py')
TEMPLATE=('{"imageId":{{json .Id}},"os":{{json .Os}},"architecture":{{json .Architecture}},'
    '"user":{{json (index .Config "User")}},"command":{{json (index .Config "Cmd")}},'
    '"entrypoint":{{json (index .Config "Entrypoint")}},'
    '"revision":{{json (index .Config.Labels "org.opencontainers.image.revision")}},'
    '"version":{{json (index .Config.Labels "org.opencontainers.image.version")}},'
    '"target":{{json (index .Config.Labels "org.mercurion.environment")}}}')


def command(*args,check=True):
    environment={key:value for key,value in os.environ.items() if key not in ('DOCKER_HOST','DOCKER_CONTEXT')}
    return subprocess.run(args,capture_output=True,check=check,timeout=30,env=environment)


def docker(*args,check=True):
    return command('docker','--context','desktop-linux',*args,check=check)


def selected_file(container,path):
    copied=docker('cp',container+':'+path,'-',check=False)
    if copied.returncode:
        # An engine/permission failure must not become evidence that a file is absent.
        if b'Could not find the file ' in copied.stderr or b'No such file or directory' in copied.stderr:
            return None
        raise RuntimeError('copy-unavailable')
    with tarfile.open(fileobj=io.BytesIO(copied.stdout)) as archive:
        members=archive.getmembers()
        if len(members)!=1 or not members[0].isfile() or members[0].size>1024*1024:
            raise ValueError('selected-file-shape')
        return archive.extractfile(members[0]).read()


def inspect(image,source):
    endpoint=json.loads(docker('context','inspect','desktop-linux').stdout)[0]['Endpoints']['docker']['Host']
    if not endpoint.startswith(('npipe://','unix://')):
        raise ValueError('local-context-required')
    if not re.fullmatch('sha256:[a-f0-9]{64}',image):
        raise ValueError('immutable-local-image-id-required')
    revision=command('git','-C',str(source),'rev-parse','HEAD').stdout.decode().strip()
    expected={name:hashlib.sha256(command('git','-C',str(source),'show',revision+':'+name).stdout).hexdigest()
              for name in SOURCES}
    metadata=json.loads(docker('image','inspect',image,'--format',TEMPLATE).stdout)
    if metadata['imageId']!=image or (metadata['os'],metadata['architecture'])!=('linux','amd64'):
        raise ValueError('image-identity')
    identifier=uuid.uuid4().hex
    container=None
    report=dict(schemaVersion=1,runId=identifier,observedAtUtc=datetime.now(timezone.utc).isoformat(),
        sourceRevision=revision,image=metadata,files={},status='pending',containersStarted=False,
        credentialsRead=False,cleanupVerified=False,vmOperations=False,
        sourceComparison='Git HEAD blobs; Python source CRLF normalized to LF; raw hashes retained')
    try:
        container=docker('create','--pull','never','--network','none','--read-only',
            '--label',LABEL+'='+identifier,'--entrypoint','python',image,'-V').stdout.decode().strip()
        if not re.fullmatch('[a-f0-9]{64}',container):
            raise ValueError('container-id')
        for name in SOURCES:
            raw=selected_file(container,'/app/'+name)
            actual=hashlib.sha256(raw).hexdigest() if raw is not None else None
            normalized=hashlib.sha256(raw.replace(b'\r\n',b'\n')).hexdigest() if raw is not None else None
            report['files'][name]=dict(present=raw is not None,sha256=actual,
                expectedSha256=expected[name],normalizedSha256=normalized,matchesNormalizedSource=normalized==expected[name])
        for name,path in (('buildIdentity','/usr/share/mercurion/build-identity.json'),
                          ('modelManifest','/app/model/manifest.json')):
            raw=selected_file(container,path)
            report[name]=json.loads(raw) if raw is not None else None
        report['matchesSource']=(metadata['revision']==revision and
            all(value['matchesNormalizedSource'] for value in report['files'].values()))
        report['status']='source-matches' if report['matchesSource'] else 'source-mismatch'
    finally:
        if container:
            owner=docker('inspect','--format','{{index .Config.Labels "'+LABEL+'"}}',container).stdout.decode().strip()
            if owner!=identifier:
                raise ValueError('container-owner')
            docker('rm',container)
            remaining=docker('ps','-aq','--filter','label='+LABEL+'='+identifier).stdout.strip()
            if remaining:
                raise ValueError('cleanup-incomplete')
            report['cleanupVerified']=True
    return report


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',required=True,help='Already-local immutable sha256 image ID')
    parser.add_argument('--source',required=True,type=Path,help='Read-only source checkout; compares committed HEAD')
    parser.add_argument('--output',required=True,type=Path,help='New metadata-only JSON report')
    args=parser.parse_args()
    if args.output.exists() or not args.output.parent.is_dir():
        raise ValueError('new-report-in-existing-directory-required')
    report=inspect(args.image,args.source)
    with args.output.open('x',encoding='utf-8') as stream:
        json.dump(report,stream,indent=2)
    print(json.dumps(dict(status=report['status'],sourceRevision=report['sourceRevision'],
        imageId=args.image,missingFiles=[name for name,value in report['files'].items() if not value['present']],
        cleanupVerified=report['cleanupVerified'],containersStarted=False,reportPath=str(args.output))))


if __name__=='__main__':
    main()
