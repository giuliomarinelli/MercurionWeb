"""Disposable 1.56-to-1.14 transfer QA; only synthetic documents and credentials."""
import argparse
import json
from pathlib import Path
import secrets
import subprocess
import time
import uuid

from meili_logical_transfer import ApiError, Client, export, restore


def qa(old_image,new_image,output):
    output.mkdir(parents=True,exist_ok=False)
    run=uuid.uuid4().hex
    label='mercurion.meili-transfer='+run
    containers=[]
    key=secrets.token_hex(32)
    result=dict(status='failed',runId=run,syntheticOnly=True,vmChanged=False,cleanupErrors=[])
    def docker(*args):
        value=subprocess.run(['docker','--context','desktop-linux',*args],capture_output=True,text=True,timeout=90)
        if value.returncode: raise ValueError('meili-fixture-docker-failed')
        return value.stdout.strip()
    def start(suffix,image):
        name='meili-transfer-'+run+'-'+suffix
        containers.append(name)
        docker('run','-d','--pull','never','--name',name,'--label',label,'--read-only','--user','10001:10001',
               '--cap-drop','ALL','--security-opt','no-new-privileges:true','--publish','127.0.0.1::7700',
               '--memory','512m','--pids-limit','96','--tmpfs','/meili_data:rw,size=128m,uid=10001,gid=10001,mode=700',
               '--tmpfs','/tmp:rw,size=16m,mode=1777','--env','MEILI_MASTER_KEY='+key,
               '--env','MEILI_DB_PATH=/meili_data/data.ms','--env','MEILI_ENV=production',
               '--env','MEILI_NO_ANALYTICS=true','--env','MEILI_MAX_INDEXING_MEMORY=64Mb','--env','MEILI_MAX_INDEXING_THREADS=1',image)
        port=docker('port',name,'7700/tcp').rsplit(':',1)[1]
        client=Client('http://127.0.0.1:'+port,key)
        for _ in range(80):
            try:
                if client.call('/health')['status']=='available': return client
            except (ValueError,OSError):pass
            time.sleep(.2)
        raise ValueError('meili-fixture-not-ready')
    try:
        source=start('source',old_image)
        target=start('target',new_image)
        result['sourceVersion']=source.call('/version')['pkgVersion']
        result['targetVersion']=target.call('/version')['pkgVersion']
        if (result['sourceVersion'],result['targetVersion'])!=('1.56.2','1.14.0'):
            raise ValueError('meili-fixture-version-mismatch')
        source.wait(source.call('/indexes',{'uid':'logs_staging','primaryKey':'id'},'POST'))
        defaults=source.call('/indexes/logs_staging/settings')
        (output/'source-defaults.json').write_text(json.dumps(defaults,indent=2),encoding='utf-8')
        source.wait(source.call('/indexes/logs_staging/settings',{'filterableAttributes':['level'],'sortableAttributes':['createdAt']},'PATCH'))
        source.wait(source.call('/indexes/logs_staging/documents',[
            {'id':'one','level':'info','createdAt':1,'message':'fixture alpha'},
            {'id':'two','level':'warning','createdAt':2,'message':'fixture beta'}],'POST'))
        source.wait(source.call('/indexes',{'uid':'security_logs_staging','primaryKey':'id'},'POST'))
        uid='6d3c5a97-a1be-5e5d-b595-b006d557b090'
        search=source.call('/keys',dict(uid=uid,name='fixture-search',actions=['search'],indexes=['logs_staging'],expiresAt='2027-02-10T00:00:00Z'),'POST')
        writer=source.call('/keys',dict(uid='16dbd72a-9663-542f-9220-63122b77a750',name='fixture-writer',
                          actions=['documents.add'],indexes=['logs_staging','security_logs_staging'],expiresAt='2027-02-10T00:00:00Z'),'POST')
        result['export']=export(source,output/'private-synthetic-export')
        result['restore']=restore(target,output/'private-synthetic-export',defaults)
        answer=Client(target.endpoint,search['key']).call('/indexes/logs_staging/search',{'q':'fixture','filter':'level = warning','sort':['createdAt:desc']},'POST')
        if [hit['id'] for hit in answer['hits']]!=['two']: raise ValueError('meili-search-regression')
        try:
            Client(target.endpoint,search['key']).call('/indexes/logs_staging/documents',[{'id':'unauthorized'}],'POST')
        except ValueError as error:
            if str(error)!='meili-http-403': raise
        else: raise ValueError('meili-key-permissions-widened')
        restricted=Client(target.endpoint,writer['key'])
        task=restricted.call('/indexes/security_logs_staging/documents',[{'id':'writer-fixture','message':'preserved write permission'}],'POST')
        target.wait(task)
        try:restricted.call('/indexes/security_logs_staging/documents')
        except ValueError as error:
            if str(error)!='meili-http-403':raise
        else:raise ValueError('meili-writer-read-permission-widened')
        result.update(status='passed',searchAndFilter=True,scopedWriteDenied=True,writerPermissionPreserved=True,writerReadDenied=True)
    except Exception as error:
        result.update(errorType=type(error).__name__,code=str(error) if str(error).startswith('meili-') else 'fixture-operation-failed')
        if isinstance(error,ApiError):result.update(apiCode=error.api_code,operation=error.operation)
    finally:
        for name in reversed(containers):
            try: docker('rm','--force',name)
            except ValueError:result['cleanupErrors'].append('container')
        if result['cleanupErrors']:result['status']='failed'
        (output/'result.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--old-image',required=True)
    parser.add_argument('--new-image',required=True)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--execute',required=True,action='store_true')
    args=parser.parse_args()
    result=qa(args.old_image,args.new_image,args.output.resolve())
    print(json.dumps(result));raise SystemExit(0 if result['status']=='passed' else 1)
