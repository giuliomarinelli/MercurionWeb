"""Local, disposable Meilisearch + Windows PowerShell 5.1 operator-curl QA."""
import argparse, json, os, secrets, subprocess, time, urllib.request, uuid
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
source=Path(__file__).with_name('Invoke-PreviewMeiliLogIndexes.ps1').read_text(encoding='utf-8')
rid=uuid.uuid4().hex
name='vm044-curl-'+rid
network=name+'-net'
key=secrets.token_hex(32)
image=args.image
def docker(*args):
    answer=subprocess.run(['docker','--context','desktop-linux',*args],capture_output=True,text=True,encoding='utf-8',timeout=90)
    if answer.returncode: raise RuntimeError('QA Docker command failed: '+answer.stderr)
    return answer.stdout.strip()

report=dict(runId=rid,scope='local synthetic PowerShell 5.1 curl; not VM',image=image,checks=[],cleanupErrors=[])
created=False
try:
    docker('image','inspect',image)
    docker('network','create','--label','mercurion.vm044-qa='+rid,network)
    created=True
    docker('run','-d','--pull','never','--name',name,'--label','mercurion.vm044-qa='+rid,'--network',network,
        '--publish','127.0.0.1::7700','--read-only','--user','10001:10001','--cap-drop','ALL',
        '--security-opt','no-new-privileges:true','--memory','512m','--pids-limit','96',
        '--tmpfs','/meili_data:rw,size=128m,uid=10001,gid=10001,mode=700','--tmpfs','/tmp:rw,nosuid,size=16m,mode=1777',
        '--env','MEILI_MASTER_KEY='+key,'--env','MEILI_ENV=production','--env','MEILI_NO_ANALYTICS=true',
        '--env','MEILI_MAX_INDEXING_MEMORY=64Mb','--env','MEILI_MAX_INDEXING_THREADS=1',image)
    port=docker('port',name,'7700/tcp').rsplit(':',1)[1]
    endpoint='http://127.0.0.1:'+port
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def api(path, body=None, method=None):
        data=None if body is None else json.dumps(body).encode()
        req=urllib.request.Request(endpoint+path,data=data,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},method=method)
        with opener.open(req,timeout=5) as response: return json.load(response)
    for attempt in range(60):
        try:
            if api('/health')['status']=='available': break
        except OSError: time.sleep(.25)
    else: raise RuntimeError('QA Meili not ready')
    env=dict(os.environ,PSModulePath=os.path.join(os.environ['SystemRoot'],'System32/WindowsPowerShell/v1.0/Modules'))
    def run(supplied, expected_success):
        stub="function Read-Host { param([string]$Prompt,[switch]$AsSecureString) $s=New-Object Security.SecureString; '"+supplied+"'.ToCharArray() | ForEach-Object { $s.AppendChar($_) }; return $s }\n"
        result=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',stub+source.replace(':17700/',':'+port+'/').replace(':17700\'',':'+port+'\'')],env=env,capture_output=True,text=True,timeout=80)
        assert supplied not in result.stdout+result.stderr, 'Credential exposed in output'
        assert (result.returncode==0)==expected_success, (result.returncode, result.stdout, result.stderr)
        if expected_success:
            value=json.loads(result.stdout.splitlines()[-1])
            assert value['status']=='LOG_INDEXES_READY' and value['count']==4 and value['apiKeysCreated'] is False
            return value
        assert 'LOG_INDEXES_READY' not in result.stdout
    first=run(key,True)
    names={'logs_staging','security_logs_staging','logs_production','security_logs_production'}
    assert {item['uid'] for item in first['indexes']}==names
    assert all(item['primaryKey']=='id' and item['taskUid'] is not None for item in first['indexes'])
    report['checks'].append('four real index creations, task success and primary-key readback')
    before=api('/tasks')['total']
    second=run(key,True)
    assert api('/tasks')['total']==before and all(item['taskUid'] is None for item in second['indexes'])
    report['checks'].append('existing correct indexes reused without mutation')
    run('b'*64,False)
    assert api('/tasks')['total']==before
    report['checks'].append('invalid credential rejected without mutation or credential output')
    run('invalid"\nkey',False)
    assert api('/tasks')['total']==before
    report['checks'].append('malformed credential rejected before curl config injection')
    def wait(task):
        for attempt in range(100):
            value=api('/tasks/'+str(task['taskUid']))
            if value['status']=='succeeded': return
            if value['status']=='failed': raise RuntimeError('QA setup task failed')
            time.sleep(.05)
        raise RuntimeError('QA setup task timeout')
    wait(api('/indexes/logs_staging',method='DELETE'))
    wait(api('/indexes',dict(uid='logs_staging',primaryKey='unexpected')))
    before=api('/tasks')['total']
    run(key,False)
    assert api('/tasks')['total']==before
    report['checks'].append('unexpected primary key blocks before writes')
    report['status']='passed'
finally:
    for identifier in docker('ps','-aq','--filter','label=mercurion.vm044-qa='+rid).splitlines():
        try: docker('rm','-f',identifier)
        except Exception as error: report['cleanupErrors'].append(type(error).__name__)
    if created:
        try: docker('network','rm',network)
        except Exception as error: report['cleanupErrors'].append(type(error).__name__)
    path=base/('vm044-indexes-qa-'+rid+'.json')
    path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(status=report.get('status','failed'),checkCount=len(report['checks']),cleanupErrors=report['cleanupErrors'],reportPath=str(path))))
