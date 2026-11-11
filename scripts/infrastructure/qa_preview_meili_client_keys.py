"""Disposable real-Meili curl and private-file QA. Only synthetic configurations."""
import argparse, csv, json, os, secrets, subprocess, time, urllib.error, urllib.request, uuid
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--execute', action='store_true', help='Explicit local disposable Docker/PowerShell QA')
parser.add_argument('--image', required=True, help='Already verified local Meilisearch image ID or immutable tag')
parser.add_argument('--output', type=Path, required=True, help='QA artifacts under the operator profile')
args=parser.parse_args()
if not args.execute: parser.error('Local fixture execution requires --execute')
base=args.output.resolve()
if Path.home().resolve() not in base.parents: parser.error('QA output must be below the user profile')
base.mkdir(parents=True,exist_ok=False)
source=Path(__file__).with_name('Invoke-PreviewMeiliClientKeys.ps1').read_text(encoding='utf-8')
rid=uuid.uuid4().hex
name='vm044-keys-'+rid
network=name+'-net'
key=secrets.token_hex(32)
image=args.image
uids=['6d3c5a97-a1be-5e5d-b595-b006d557b090','16dbd72a-9663-542f-9220-63122b77a750']
env=dict(os.environ,PSModulePath=os.path.join(os.environ['SystemRoot'],'System32/WindowsPowerShell/v1.0/Modules'))
sid=list(csv.reader(subprocess.check_output(['whoami','/user','/fo','csv','/nh'],text=True).splitlines()))[0][1]
report=dict(runId=rid,scope='local synthetic Meili/Windows PowerShell 5.1/private QA files only',checks=[],cleanupErrors=[])
def docker(*args):
    value=subprocess.run(['docker','--context','desktop-linux',*args],capture_output=True,text=True,encoding='utf-8',timeout=90)
    if value.returncode: raise RuntimeError('QA Docker command failed: '+value.stderr)
    return value.stdout.strip()
created=False
try:
    docker('image','inspect',image)
    docker('network','create','--label','mercurion.vm044-key-qa='+rid,network); created=True
    docker('run','-d','--pull','never','--name',name,'--label','mercurion.vm044-key-qa='+rid,'--network',network,
        '--publish','127.0.0.1::7700','--read-only','--user','10001:10001','--cap-drop','ALL',
        '--security-opt','no-new-privileges:true','--memory','512m','--pids-limit','96',
        '--tmpfs','/meili_data:rw,size=128m,uid=10001,gid=10001,mode=700','--tmpfs','/tmp:rw,nosuid,size=16m,mode=1777',
        '--env','MEILI_MASTER_KEY='+key,'--env','MEILI_ENV=production','--env','MEILI_NO_ANALYTICS=true',
        '--env','MEILI_MAX_INDEXING_MEMORY=64Mb','--env','MEILI_MAX_INDEXING_THREADS=1',image)
    port=docker('port',name,'7700/tcp').rsplit(':',1)[1]
    endpoint='http://127.0.0.1:'+port
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def api(path,body=None,method=None,credential=key,expected=200):
        req=urllib.request.Request(endpoint+path,data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization':'Bearer '+credential,'Content-Type':'application/json'},method=method)
        try:
            with opener.open(req,timeout=5) as response:
                assert response.status==expected
                return json.load(response)
        except urllib.error.HTTPError as error:
            assert error.code==expected,(path,error.code,expected)
            return json.load(error)
    for attempt in range(60):
        try:
            if api('/health')['status']=='available': break
        except OSError: time.sleep(.25)
    else: raise RuntimeError('QA server not ready')
    def wait(task):
        for attempt in range(100):
            value=api('/tasks/'+str(task['taskUid']))
            if value['status']=='succeeded': return
            if value['status']=='failed': raise RuntimeError('QA seed task failed')
            time.sleep(.05)
        raise RuntimeError('QA seed timeout')
    logs=['logs_staging','security_logs_staging','logs_production','security_logs_production']
    molecular=['molecule_previews_chembl_36','molecule_details_chembl_36']
    for index in logs: wait(api('/indexes',dict(uid=index,primaryKey='id'),expected=202))
    qa=base/('vm044-key-private-qa-'+rid)
    qa.mkdir()
    subprocess.run(['icacls.exe',str(qa),'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F','*S-1-5-18:(OI)(CI)F'],check=True,capture_output=True)
    script=qa/'operator-qa.ps1'
    script.write_text(source.replace(':17700\'',':'+port+'\''),encoding='utf-8')
    def fixture(label):
        folder=qa/label; folder.mkdir()
        # Explicitly protected, same ACL policy as the owner's real directory.
        subprocess.run(['icacls.exe',str(folder),'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F','*S-1-5-18:(OI)(CI)F'],check=True,capture_output=True)
        path=folder/'configuration.json'
        doc=dict(schemaVersion=1,environment='preview',origin='https://preview.mercurion.app',
            meilisearchClients=dict(searchKey='',logKey=''),meilisearchServer=dict(masterKey=key),
            preserve=dict(provider='synthetic-provider-marker',array=['single'],nested=[dict(v=True)],pem='synthetic\nmultiline\n'))
        path.write_bytes(b'\xef\xbb\xbf'+json.dumps(doc,indent=2).encode()+b'\n')
        return path,doc
    def run(path,supplied=key,expiry='None',success=True):
        stub="function Read-Host { param([string]$Prompt,[switch]$AsSecureString) $s=New-Object Security.SecureString; '"+supplied.replace("'","''")+"'.ToCharArray() | ForEach-Object { $s.AppendChar($_) }; return $s }\n"
        cmd=stub+"& '"+str(script)+"' -ConfigurationPath '"+str(path)+"' -Expiry "+expiry
        result=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',cmd],env=env,capture_output=True,text=True,timeout=60)
        assert supplied not in result.stdout+result.stderr,'Credential exposed in output'
        assert (result.returncode==0)==success,(result.returncode,result.stdout,result.stderr)
        if success:
            value=json.loads(result.stdout.splitlines()[-1]); assert value['status']=='MEILI_CLIENT_KEYS_READY' and value['readOnly403Checks']==4
            return value
        assert 'MEILI_CLIENT_KEYS_READY' not in result.stdout
    for expiry in ['None','90Days']:
        if expiry=='90Days':
            for uid in uids:
                req=urllib.request.Request(endpoint+'/keys/'+uid,headers={'Authorization':'Bearer '+key},method='DELETE')
                with opener.open(req,timeout=5) as response: assert response.status==204
        path,original=fixture('success-'+expiry)
        raw=path.read_bytes()
        value=run(path,expiry=expiry)
        updated=json.loads(path.read_text(encoding='utf-8-sig'))
        keys=updated.pop('meilisearchClients')
        assert updated=={k:v for k,v in original.items() if k!='meilisearchClients'}
        assert Path(str(path)+'.pre-meili-keys.backup').read_bytes()==raw
        assert not Path(str(path)+'.meili-keys.pending').exists()
        assert len(set(keys.values()))==2 and key not in keys.values()
        search=api('/keys/'+uids[0]); writer=api('/keys/'+uids[1])
        assert keys==dict(searchKey=search['key'],logKey=writer['key'])
        assert set(search['actions'])=={'search','documents.get'} and set(search['indexes'])==set(molecular)
        assert writer['actions']==['documents.add'] and set(writer['indexes'])==set(logs[:2])
        assert (search['expiresAt'] is None)==(expiry=='None')
        if expiry=='None':
            # Match the real VM: ChEMBL indexes do not exist at key creation.
            for index in molecular:
                wait(api('/indexes',dict(uid=index,primaryKey='id'),expected=202))
                wait(api('/indexes/'+index+'/documents',[dict(id='synthetic-molecule')],expected=202))
        for index in molecular:
            assert api('/indexes/'+index+'/search',dict(q=''),credential=keys['searchKey'])['hits']
            assert api('/indexes/'+index+'/documents/synthetic-molecule',credential=keys['searchKey'])['id']=='synthetic-molecule'
        for index in logs[:2]: wait(api('/indexes/'+index+'/documents',[dict(id='synthetic-log')],credential=keys['logKey'],expected=202))
        assert api('/keys',credential=keys['logKey'],expected=403)['code']=='invalid_api_key'
        assert api('/indexes/logs_production/documents',[dict(id='forbidden')],credential=keys['logKey'],expected=403)['code']=='invalid_api_key'
        assert api('/indexes/'+molecular[0]+'/documents',[dict(id='forbidden')],credential=keys['searchKey'],expected=403)['code']=='invalid_api_key'
        report['checks'].append('real grants, allow/deny, atomic two-field update, exact backup and private ACLs: '+expiry)
        before=path.read_bytes(); key_count=api('/keys')['total']
        run(path,expiry=expiry,success=False)
        assert path.read_bytes()==before and api('/keys')['total']==key_count
        report['checks'].append('existing config/backup blocks rerun without rotation: '+expiry)
    path,_=fixture('wrong-key'); before=path.read_bytes(); count=api('/keys')['total']
    run(path,supplied='b'*64,success=False)
    assert path.read_bytes()==before and api('/keys')['total']==count
    report['checks'].append('wrong admin key leaves configuration and grants unchanged')
    path,_=fixture('malformed-key'); before=path.read_bytes()
    run(path,supplied='not-a-key',success=False)
    assert path.read_bytes()==before
    report['checks'].append('malformed admin key fails before curl')
    path,_=fixture('bad-acl'); before=path.read_bytes()
    subprocess.run(['icacls.exe',str(path),'/grant','*S-1-1-0:R'],check=True,capture_output=True)
    run(path,success=False)
    assert path.read_bytes()==before
    report['checks'].append('unexpected file ACL blocks before private read and network mutation')
    path,_=fixture('bad-json'); path.write_text('{"invalid":"synthetic-private-marker"',encoding='utf-8')
    run(path,success=False)
    report['checks'].append('invalid private JSON fails with fixed diagnostic')
    # Existing deterministic UID with excessive grants must not be accepted or overwritten.
    req=urllib.request.Request(endpoint+'/keys/'+uids[0],headers={'Authorization':'Bearer '+key},method='DELETE')
    opener.open(req,timeout=5).close()
    api('/keys',dict(uid=uids[0],actions=['*'],indexes=['*'],expiresAt=None),expected=201)
    path,_=fixture('excessive-grants'); before=path.read_bytes(); count=api('/keys')['total']
    run(path,success=False)
    assert path.read_bytes()==before and api('/keys')['total']==count
    report['checks'].append('preexisting excessive grants rejected without overwrite or new key')
    report['status']='passed'
finally:
    for identifier in docker('ps','-aq','--filter','label=mercurion.vm044-key-qa='+rid).splitlines():
        try: docker('rm','-f',identifier)
        except Exception as error: report['cleanupErrors'].append(type(error).__name__)
    if created:
        try: docker('network','rm',network)
        except Exception as error: report['cleanupErrors'].append(type(error).__name__)
    output=base/('vm044-keys-qa-'+rid+'.json')
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(status=report.get('status','failed'),checkCount=len(report['checks']),cleanupErrors=report['cleanupErrors'],reportPath=str(output))))
