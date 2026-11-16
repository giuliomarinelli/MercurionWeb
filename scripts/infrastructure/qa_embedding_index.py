"""Actual two-container exclusive-volume handoff, parallel HNSW and failed-build restoration."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import time
import uuid
from unittest.mock import patch

import guest_embedding_index as guest


def qa(image, report):
    if report.exists():raise ValueError('qa-report-exists')
    prefix=['docker','--context','desktop-linux']
    name='hnsw-qa-'+uuid.uuid4().hex
    volume=name+'-data'
    result=dict(status='failed',syntheticOnly=True,vmChanged=False,checks=[],cleanupErrors=[])
    def docker(*args):
        value=subprocess.run([*prefix,*args],capture_output=True,text=True,timeout=120)
        if value.returncode:raise ValueError('index-qa-docker-failed')
        return value.stdout.strip()
    def admin(cid,text):
        value=subprocess.run([*prefix,'exec','-i',cid,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','mercurion_preview'],input=text,capture_output=True,text=True,timeout=120)
        if value.returncode:raise ValueError('index-qa-admin-sql-failed')
        return value.stdout.strip()
    original=None
    with tempfile.TemporaryDirectory(prefix='mercurion-hnsw-qa-') as directory,patch.object(guest,'PREFIX',prefix):
        secrets=Path(directory);(secrets/'application-password').write_text('synthetic-fixture')
        try:
            image=docker('image','inspect',image,'--format','{{.Id}}')
            docker('volume','create',volume)
            docker('run','--rm','--pull','never','--network','none','--user','0:0','--cap-drop','ALL','--cap-add','CHOWN',
                '--mount','type=volume,src='+volume+',dst=/data','--entrypoint','chown',image,'70:70','/data')
            original=docker('run','-d','--name',name,'--pull','never','--network','none','--read-only','--user','70:70',
                '--cap-drop','ALL','--security-opt','no-new-privileges:true',
                '--mount','type=volume,src='+volume+',dst=/var/lib/postgresql/data',
                '--mount','type=bind,src='+str(secrets)+',dst=/run/mercurion,readonly',
                '--tmpfs','/tmp:rw,size=16m,mode=1777',
                '--tmpfs','/var/run/postgresql:rw,size=16m,uid=70,gid=70,mode=3775',
                '--env','POSTGRES_DB=mercurion_preview','--env','POSTGRES_PASSWORD=synthetic-fixture',image)
            for _ in range(120):
                try:
                    if docker('exec',original,'cat','/proc/1/comm')=='postgres' and admin(original,'SELECT 1;')=='1':break
                except ValueError:pass
                time.sleep(.25)
            else:raise ValueError('index-qa-original-not-ready')
            admin(original,"CREATE ROLE mercurion_preview LOGIN SUPERUSER PASSWORD 'synthetic-fixture'; CREATE EXTENSION vector; CREATE TABLE molecule_embeddings(molregno integer PRIMARY KEY, embedding vector(768)); INSERT INTO molecule_embeddings SELECT n, ('['||'1,'||repeat('0,',766)||'0]')::vector FROM generate_series(1,2000) n;")
            pg=dict(id=original,image=image)
            status={}
            def build(cid):
                info=json.loads(docker('inspect','--format','{{json .HostConfig}}',cid))
                if (info['Memory']!=24*guest.GIB or info['NanoCpus']!=12*10**9 or info['ShmSize']!=22*guest.GIB
                        or info['NetworkMode']!='none' or info.get('PortBindings')):
                    raise ValueError('index-qa-maintenance-contract')
                guest.sql(cid,"SET maintenance_work_mem='64MB'; SET max_parallel_maintenance_workers=2; CREATE INDEX fixture_hnsw ON molecule_embeddings USING hnsw(embedding vector_cosine_ops);")
                if guest.sql(cid,"SELECT indisvalid FROM pg_index WHERE indexrelid='fixture_hnsw'::regclass;")!='t':
                    raise ValueError('index-qa-invalid-index')
            guest.lifecycle(pg,volume,str(secrets),name+'-maintenance',build,status,lambda:None)
            if guest.sql(original,'SELECT count(*) FROM molecule_embeddings;')!='2000':raise ValueError('index-qa-data-lost')
            info=json.loads(docker('inspect','--format','{{json .HostConfig}}',original))
            if info['Memory']!=4*guest.GIB or info['NanoCpus']!=4*10**9:raise ValueError('index-qa-ordinary-profile')
            result['checks'].append('same original ID and volume restored after actual parallel HNSW; 2000 rows retained; 12 CPU / 24 GiB / 22 GiB shm verified')
            def fail(cid):raise ValueError('synthetic-build-failure')
            try:guest.lifecycle(pg,volume,str(secrets),name+'-failed',fail,{},lambda:None)
            except ValueError as error:
                if str(error)!='synthetic-build-failure':raise
            else:raise ValueError('index-qa-failure-not-propagated')
            if guest.sql(original,'SELECT count(*) FROM molecule_embeddings;')!='2000':raise ValueError('index-qa-failed-build-data-lost')
            result['checks'].append('build failure restores original PostgreSQL and retains data without concurrent writers')
            result.update(status='passed',productionDatasetUsed=False,
                note='QA uses 64 MB maintenance and two workers on synthetic rows; 20 GiB/11-worker dataset build remains VM evidence')
        except Exception as error:
            result.update(errorType=type(error).__name__,code=str(error) if isinstance(error,ValueError) else 'index-qa-failed')
        finally:
            for container in (name+'-maintenance',name+'-failed',name):
                if docker('ps','-aq','--filter','name=^/'+container+'$'):
                    try:docker('rm','--force',container)
                    except ValueError:result['cleanupErrors'].append(container)
            try:docker('volume','rm',volume)
            except ValueError:result['cleanupErrors'].append('fixture-volume')
            if result['cleanupErrors']:result['status']='failed'
            report.parent.mkdir(parents=True,exist_ok=True)
            with report.open('x') as stream:json.dump(result,stream,indent=2)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',required=True);parser.add_argument('--report',required=True,type=Path)
    parser.add_argument('--execute',required=True,action='store_true')
    args=parser.parse_args();result=qa(args.image,args.report)
    print(json.dumps(result));raise SystemExit(0 if result['status']=='passed' else 1)
