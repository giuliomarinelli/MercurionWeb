"""Replace preview servers on separate volumes; retain the original containers for rollback."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import time
import tomllib

import guest_preview_recovery_inventory as snapshot
import guest_preview_cold_recovery as cold
import guest_preview_servers as probes
from meili_logical_transfer import Client, export as export_meili, restore as restore_meili
from run_tox21_vm_pilot import load_archive

ROLES={'postgres-preview':'postgres','redis-preview':'redis','nats-preview':'nats','meilisearch':'meilisearch'}


def emit(value):
    try:print(json.dumps(value),flush=True)
    except (BrokenPipeError,OSError):pass  # Complete the receipt/rollback even if the SSH console disconnects.


def docker(*args, data=None, binary=False, timeout=180):
    env={k:v for k,v in os.environ.items() if not k.startswith(('DOCKER_','COMPOSE_'))}
    env['COMPOSE_DISABLE_ENV_FILE']='true'
    value=subprocess.run(['docker','--host','unix:///var/run/docker.sock',*args],input=data,
                         capture_output=True,env=env,timeout=timeout)
    if value.returncode:raise ValueError('upgrade-docker-operation-failed')
    return value.stdout if binary else value.stdout.decode().strip()


def write(path,value,mode=0o600):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,mode)
    with os.fdopen(fd,'w',encoding='utf-8') as stream:json.dump(value,stream,indent=2)


def docker_stream(arguments,source=None,destination=None,timeout=1800):
    env={k:v for k,v in os.environ.items() if not k.startswith(('DOCKER_','COMPOSE_'))}
    env['COMPOSE_DISABLE_ENV_FILE']='true'
    value=subprocess.run(['docker','--host','unix:///var/run/docker.sock',*arguments],
                         stdin=source,stdout=destination or subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=timeout)
    if value.returncode:raise ValueError('upgrade-docker-stream-failed')
    return value.stdout.decode().strip() if value.stdout is not None else None


def address(identifier):
    networks=json.loads(docker('inspect','--format','{{json .NetworkSettings.Networks}}',identifier))
    if len(networks)!=1:raise ValueError('upgrade-server-network')
    return next(iter(networks.values()))['IPAddress']


def pg(identifier,query):
    command='export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec psql -XAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U mercurion_preview -d mercurion_preview -c "$1"'
    return docker('exec',identifier,'sh','-c',command,'probe',query)


def rollback_generation(uid,original,paused):
    for cid in paused:
        if docker('inspect','--format','{{.State.Running}}',cid)=='true':docker('stop','--time','30',cid)
    for cid in docker('ps','-aq','--filter','label=mercurion.upgrade.run='+uid).split():
        docker('stop','--time','30',cid)
    for item in original.values():
        if docker('inspect','--format','{{.Image}}',item['id'])!=item['image']:
            raise ValueError('upgrade-rollback-image-drift')
        if docker('inspect','--format','{{.State.Running}}',item['id'])!='true':docker('start',item['id'])
    for cid in paused:
        if docker('inspect','--format','{{.State.Running}}',cid)!='true':docker('start',cid)


def volume_path(name):
    item=json.loads(docker('volume','inspect',name))[0]
    expected=Path(docker('info','--format','{{.DockerRootDir}}'))/'volumes'/name/'_data'
    if item['Driver']!='local' or item.get('Options') or Path(item['Mountpoint'])!=expected:
        raise ValueError('upgrade-volume-path')
    return expected


def table_counts(identifier):
    names=json.loads(pg(identifier,"SELECT coalesce(json_agg(tablename ORDER BY tablename),'[]') FROM pg_tables WHERE schemaname='public'"))
    return {name:int(pg(identifier,'SELECT count(*) FROM public."'+name.replace('"','""')+'"')) for name in names}


def clone_redis(source,destination):
    for base,dirs,files in os.walk(source,followlinks=False):
        for name in dirs+files:
            path=Path(base)/name
            info=path.lstat()
            if path.is_symlink() or not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                raise ValueError('upgrade-redis-special-file')
    shutil.copytree(source,destination,dirs_exist_ok=True,symlinks=False)
    for base,dirs,files in os.walk(destination,followlinks=False):
        os.chown(base,999,1000)
        for name in dirs+files:os.chown(Path(base)/name,999,1000,follow_symlinks=False)


def compose_models(original,loaded,uid,server_run):
    models=copy.deepcopy(original)
    for scope,model in models.items():
        model['name']='mercurion-u'+uid+'-'+scope
        for key,network in list(model['networks'].items()):
            model['networks'][key]={'name':network['name'],'external':True}
        for key,volume in model['volumes'].items():
            volume.clear();volume.update(name='mercurion_u'+uid+'_'+key.replace('-','_'),external=True)
        for service,spec in model['services'].items():
            spec['image']=loaded[ROLES[service]]['imageId']
            spec.setdefault('labels',{}).update({'mercurion.bootstrap.run':uid,'mercurion.upgrade.run':uid,
                                               'mercurion.secret-source.run':server_run})
    return models


def execute(root,manifest):
    import fcntl
    uid=manifest['upgradeId'];sid=manifest['serverRunId']
    server_root=snapshot.BASE/('server-'+sid)
    digest=manifest['serverManifestSha256']
    if os.geteuid()!=0 or root!=snapshot.BASE/('upgrade-'+uid):raise ValueError('upgrade-protected-scope')
    for path in (root,*root.parents):
        info=path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid!=0 or info.st_mode&0o022:raise ValueError('upgrade-protected-owner')
    lock=os.open(server_root/'service-upgrade.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)  # Held until the owner command process exits.
    if snapshot.active_upgrade(server_root,digest):raise ValueError('upgrade-generation-already-active')
    current=snapshot.inventory(sid,digest);current['runId']=sid
    if current['bootId']!=manifest['bootId'] or not all(c['running'] for c in current['containers']):
        raise ValueError('upgrade-running-baseline-required')
    _,receiver,old_manifest,old_loaded,old_models=cold.original(server_root,digest)
    cold.validate_contract(current,old_models,old_loaded,running=True)
    cold.resources(current,old_models)
    apps=cold.registered_applications(current)
    if len(apps)!=4:raise ValueError('upgrade-registered-applications-required')
    receiver.inspect(sid)
    private=receiver.BASE/sid/'active'
    original={item['service']:item for item in current['containers']}
    app_ids={item['service']:item['id'] for item in apps}
    app_record=cold.read(server_root/'application-members.json')
    app_root=snapshot.BASE/('application-'+app_record['appRunId'])
    paused=[app_ids[name] for name in ('web-node-preview','tox21-preview')]
    result=dict(schemaVersion=1,upgradeId=uid,serverRunId=sid,status='failed',phase='preflight',
                loaded={},servers=[],applications=apps,checks={},rollback='not-needed',
                valuesPrinted=False,publishedPorts=False,isolationAccepted=False)
    backup=root/'private-backup';backup.mkdir(mode=0o700)
    changed=False;models=None
    def progress(phase):
        result['phase']=phase
        temporary=root/'progress.json.tmp'
        temporary.write_text(json.dumps({k:result[k] for k in ('upgradeId','phase','status','rollback')}))
        os.replace(temporary,root/'progress.json')
        emit(dict(upgradeId=uid,phase=phase))
    try:
        data_size=0
        for item in original.values():
            for mount in item['mounts']:
                if mount['Type']=='volume':
                    path=volume_path(mount['Name'])
                    data_size+=int(subprocess.check_output(['du','-sB1',str(path)],text=True).split()[0])
        archive_size=sum((root/'images'/role/'image.tar').stat().st_size for role in manifest['images'])
        if shutil.disk_usage(root).free<2*data_size+3*archive_size+1024**3:
            raise ValueError('upgrade-insufficient-backup-and-restore-space')
        progress('loading-verified-images')
        for role,record in manifest['images'].items():
            loaded=load_archive(root/'images'/role/'image.tar',record['configDigest'],
                                root/('readback-'+role+'.tar'),execute=docker)
            if role!='edge':result['loaded'][role]=loaded
            elif docker('inspect','--format','{{.Image}}',app_ids['nginx-edge'])!=loaded['imageId']:
                raise ValueError('upgrade-edge-image-must-preserve-proxy-peer')
        # Project from the current shared/preview source, not from the historical
        # baseline. The historical projection remains the rollback contract.
        current_models=probes.bundle.projection(
            json.loads((root/'models.json').read_text()),result['loaded'],sid)
        models=compose_models(current_models,result['loaded'],uid,sid)
        for scope,model in models.items():write(root/(scope+'-servers.json'),model,0o644)
        progress('pausing-writers')
        changed=True
        for identifier in paused:docker('stop','--time','30',identifier)
        progress('backing-up-existing-data')
        pg_id=original['postgres-preview']['id']
        counts=table_counts(pg_id)
        vector=pg(pg_id,"SELECT extversion FROM pg_extension WHERE extname='vector'")
        if vector!='0.8.7':raise ValueError('upgrade-vm-vector-catalog-unexpected')
        command='export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec pg_dump -h 127.0.0.1 -U mercurion_preview -d mercurion_preview -Fc --no-owner --no-privileges'
        fd=os.open(backup/'postgres.dump',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,'wb') as stream:docker_stream(['exec',pg_id,'sh','-c',command],destination=stream)
        master=tomllib.loads((private/'meilisearch/server.toml').read_text())['master_key']
        source=Client('http://'+address(original['meilisearch']['id'])+':7700',master)
        if source.call('/version')['pkgVersion']!='1.56.2':raise ValueError('upgrade-source-meili-version')
        deadline=time.monotonic()+180
        while source.call('/tasks?statuses=enqueued,processing&limit=1')['total']:
            if time.monotonic()>deadline:raise ValueError('upgrade-meili-tasks-not-drained')
            time.sleep(.2)
        result['meiliExport']=export_meili(source,backup/'meilisearch')
        result['postgresRows']=counts
        for item in original.values():docker('stop','--time','30',item['id'])
        for scope,model in models.items():
            for key,volume in model['volumes'].items():
                if docker('volume','ls','-q','--filter','name=^'+volume['name']+'$'):raise ValueError('upgrade-volume-collision')
                docker('volume','create','--label','mercurion.upgrade.run='+uid,'--label','mercurion.bootstrap.run='+uid,
                       '--label','com.docker.compose.project='+model['name'],'--label','com.docker.compose.volume='+key,volume['name'])
        redis_old=next(m['Name'] for m in original['redis-preview']['mounts'] if m['Type']=='volume')
        redis_new=models['preview']['volumes']['redis-data']['name']
        clone_redis(volume_path(redis_old),volume_path(redis_new))
        progress('starting-new-server-generation')
        for scope,model in models.items():
            path=root/(scope+'-servers.json')
            docker('compose','--env-file','/dev/null','-f',str(path),'up','-d','--pull','never')
            for service in model['services']:
                cid=docker('compose','--env-file','/dev/null','-f',str(path),'ps','-aq',service)
                result['servers'].append(dict(service=service,id=cid,image=result['loaded'][ROLES[service]]['imageId'],project=model['name']))
        ids={m['service']:m['id'] for m in result['servers']}
        new_pg=ids['postgres-preview']
        def pg_ready():
            if docker('exec',new_pg,'cat','/proc/1/comm')!='postgres':raise ValueError('upgrade-postgres-initializing')
            return probes.postgres_check(new_pg)
        probes.retry(pg_ready,new_pg)
        if not pg(new_pg,'SHOW server_version').startswith('16.16'):raise ValueError('upgrade-postgres-version')
        if 'v=8.2.9' not in docker('exec',ids['redis-preview'],'redis-server','--version'):
            raise ValueError('upgrade-redis-version')
        if '2.12.15' not in docker('exec',ids['nats-preview'],'/nats-server','--version'):
            raise ValueError('upgrade-nats-version')
        progress('restoring-and-verifying-data')
        with (backup/'postgres.dump').open('rb') as stream:
            toc=docker_stream(['exec','-i',new_pg,'pg_restore','--list'],source=stream).splitlines()
        selected='\n'.join(line for line in toc if not re.search(r' (?:SCHEMA - public|EXTENSION - vector|COMMENT - EXTENSION vector)(?: |$)',line))+'\n'
        docker('exec','-i',new_pg,'sh','-c','cat > /tmp/restore.list',data=selected.encode())
        command='export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec pg_restore -h 127.0.0.1 -U mercurion_preview -d mercurion_preview --exit-on-error --no-owner --no-privileges --use-list=/tmp/restore.list'
        with (backup/'postgres.dump').open('rb') as stream:
            docker_stream(['exec','-i',new_pg,'sh','-c',command],source=stream)
        if table_counts(new_pg)!=counts:raise ValueError('upgrade-postgres-row-count-mismatch')
        result['checks']['postgresRestoredRows']=True
        target_id=ids['meilisearch']
        probes.retry(lambda:probes.meili_check(address(target_id)),target_id)
        target_client=Client('http://'+address(target_id)+':7700',master)
        if target_client.call('/version')['pkgVersion']!='1.14.0':raise ValueError('upgrade-meili-version')
        result['meiliRestore']=restore_meili(target_client,backup/'meilisearch',
                                             json.loads((root/'meili-source-defaults.json').read_text()))
        result['checks']['meiliDataAndApplicationKeys']=True
        probes.retry(lambda:probes.redis_check(ids['redis-preview']),ids['redis-preview'])
        probes.retry(lambda:probes.nats_check(address(ids['nats-preview'])),ids['nats-preview'])
        cold.authenticated_nats(address(ids['nats-preview']),private/'nats/server.json')
        result['checks'].update(redisAuthAndKeyevents=True,natsCredentials=True)
        progress('resuming-and-testing-applications')
        for identifier in paused:docker('start',identifier)
        edge=app_ids['nginx-edge']
        def http(path):
            return docker('exec',edge,'wget','-q','-O','-','--header=Host: preview.mercurion.app','http://127.0.0.1'+path)
        def health():
            if not isinstance(json.loads(http('/health')),dict):raise ValueError('upgrade-health-body')
            return True
        def frontend():
            if '<html' not in http('/').lower():raise ValueError('upgrade-frontend-body')
            return True
        def rpc():
            source=(root/'preview_application_rpc.py').read_text()
            value=json.loads(docker('exec',app_ids['tox21-preview'],'python','-B','-c',source).splitlines()[-1])
            if value.get('subjects')!=5 or value.get('inference')!='real':raise ValueError('upgrade-rpc')
            return True
        for key,check,cid in [('backendHealthThroughEdge',health,app_ids['web-node-preview']),
                              ('frontendThroughEdge',frontend,app_ids['web-ng-preview']),('tox21RealRpc',rpc,app_ids['tox21-preview'])]:
            result['checks'][key]=probes.retry(check,cid)
        result.update(status='passed',phase='finished',rollback='available-original-containers-and-volumes-retained')
    except Exception as error:
        result['errorType']=type(error).__name__
        result['code']=str(error) if isinstance(error,ValueError) and re.fullmatch('[a-z0-9-]+',str(error)) else 'upgrade-operation-failed'
        if changed:
            result['rollback']='attempting'
            try:
                rollback_generation(uid,original,paused)
                result['rollback']='original-containers-restarted'
            except Exception:result['rollback']='manual-review-required'
    write(root/'upgrade-result.json',result,0o644)
    if result['status']=='passed':
        pointer=dict(schemaVersion=1,upgradeId=uid,baselineManifestSha256=digest,
                     files={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in
                            ('upgrade-result.json','shared-servers.json','preview-servers.json')})
        try:
            pending=server_root/('active-service-upgrade.'+uid+'.pending')
            write(pending,pointer,0o644)
            os.link(pending,server_root/'active-service-upgrade.json')
            try:pending.unlink()
            except OSError:pass  # The committed pointer is complete; a leftover public hardlink is harmless.
        except Exception:
            result.update(status='failed',code='upgrade-pointer-commit-failed',phase='commit-generation')
            try:
                rollback_generation(uid,original,paused)
                result['rollback']='original-containers-restarted'
            except Exception:result['rollback']='manual-review-required'
            write(root/'upgrade-result.failed.json',result,0o644)
            os.replace(root/'upgrade-result.failed.json',root/'upgrade-result.json')
    emit({key:result[key] for key in ('upgradeId','status','phase','rollback','checks')})
    return result
