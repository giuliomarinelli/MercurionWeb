"""Read-only development image audit against docker_sl; no pulls, deployment or volume changes."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

import export_preview_service as exporter

ROOT = Path(__file__).resolve().parents[2]
ROLES = {'postgres':('pg_sl',['postgres','--version']),
         'redis':('redis_sl',['redis-server','--version']),
         'nats':('nats_sl',['/nats-server','--version']),
         'meilisearch':('meilisearch_sl',['/bin/meilisearch','--version']),
         'edge':('nginx_sl_dev',['nginx','-v'])}


def command(context, *args, timeout=1200):
    result = subprocess.run(['docker','--context',context,*args],cwd=ROOT,capture_output=True,
                            encoding='utf-8',timeout=timeout)
    if result.returncode:
        raise ValueError('development-audit-docker-operation-failed')
    return (result.stdout + result.stderr).strip()


def development_model(context):
    # Explicit empty env file prevents implicit access to an ignored dotenv.
    env = {k:v for k,v in os.environ.items() if not k.startswith(('DOCKER_','COMPOSE_'))}
    env['COMPOSE_DISABLE_ENV_FILE']='true'
    with tempfile.TemporaryDirectory(prefix='mercurion-version-audit-') as directory:
        empty=Path(directory)/'empty.env'; empty.write_bytes(b'')
        raw=subprocess.check_output(['docker','--context',context,'compose','--env-file',str(empty),
            '-f',str(ROOT/'docker_sl/docker-compose.yml'),'config','--format','json'],
            cwd=ROOT,env=env,timeout=30)
    return json.loads(raw)


def audit(context, output):
    output.mkdir(parents=True,exist_ok=False)
    model=development_model(context)
    report=dict(schemaVersion=1,status='running',observedAtUtc=datetime.now(timezone.utc).isoformat(),
        source='docker_sl/docker-compose.yml',sourceSha256=hashlib.sha256((ROOT/'docker_sl/docker-compose.yml').read_bytes()).hexdigest(),
        scanner=exporter.web.SCANNER,readOnlySource=True,vmChanged=False,developmentServicesChanged=False,roles={})
    def one(role):
        service,version_args=ROLES[role]
        spec=model['services'][service]
        container=spec.get('container_name',service)
        image=command(context,'inspect','--format','{{.Image}}',container,timeout=30)
        reference=spec['image']
        expected=command(context,'image','inspect','--format','{{.Id}}',reference,timeout=30)
        version=command(context,'exec',container,*version_args,timeout=30)
        folder=output/role; folder.mkdir()
        record=dict(service=service,container=container,imageId=image,composeImage=reference,
                    composeImageMatchesRunning=image==expected,serverVersionOutput=version,status='scanning')
        (folder/'identity.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
        command(context,'save','--output',str(folder/'image.tar'),image)
        digest,_=exporter.web.delivery.archive_config(folder/'image.tar')
        database=exporter.web.scan_archive(folder,output/('cache-'+role),('docker','--context',context))
        summary=exporter.web.delivery.security_summary(json.loads((folder/'vulnerabilities.json').read_text(encoding='utf-8')),digest)
        (folder/'policy-result.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
        record.update(status='audited',configDigest=digest,securityEligible=summary['eligible'],counts=summary['counts'],
                      scannerDatabase=database,archiveSha256=exporter.web.delivery.checksum(folder/'image.tar'))
        (folder/'identity.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
        return record
    def save():
        (output/'audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    save()
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures={pool.submit(one,role):role for role in ROLES}
        for future in as_completed(futures):
            role=futures[future]
            try:
                report['roles'][role]=future.result()
            except Exception as error:
                report['roles'][role]=dict(status='failed',errorType=type(error).__name__)
            save()
            print(json.dumps(dict(role=role,status=report['roles'][role]['status'],
                securityEligible=report['roles'][role].get('securityEligible'),counts=report['roles'][role].get('counts'))),flush=True)
    report['status']='passed' if all(record.get('securityEligible') is True and record.get('composeImageMatchesRunning') is True
                                            for record in report['roles'].values()) else 'blocked'
    save()
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--context',default='desktop-linux')
    args=parser.parse_args()
    result=audit(args.context,args.output.resolve())
    print(json.dumps(dict(status=result['status'],reportPath=str(args.output.resolve()/'audit.json'),vmChanged=False)))
    raise SystemExit(0 if result['status']=='passed' else 2)
