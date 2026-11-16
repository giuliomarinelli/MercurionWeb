"""Exclusive HNSW maintenance on the existing volume, preserving the registered PG ID."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
import guest_preview_recovery_inventory as snapshot

GIB = 1024**3
PREFIX = ['docker', '--host', 'unix:///var/run/docker.sock']
SQL_SHELL = ('export PGPASSWORD="$(cat /run/mercurion/application-password)"; '
             'exec psql -XqAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U mercurion_preview -d mercurion_preview')


def docker(*args):
    environment={key:value for key,value in os.environ.items() if not key.startswith(('DOCKER_', 'COMPOSE_'))}
    result=subprocess.run([*PREFIX,*args],env=environment,capture_output=True,text=True,timeout=120)
    if result.returncode:raise ValueError('embedding-index-docker-operation-failed')
    return result.stdout.strip()


def sql(cid, text, log=None):
    result = subprocess.run([*PREFIX, 'exec', '-i', cid,
        'sh', '-c', SQL_SHELL], input=text.encode(), stdout=log or subprocess.PIPE,
        stderr=log or subprocess.PIPE, timeout=None if log else 180)
    if result.returncode:
        raise ValueError('embedding-index-sql-failed')
    return '' if log else result.stdout.decode().strip()


def ready(cid):
    for _ in range(120):
        try:
            if sql(cid, 'SELECT 1;') == '1':
                return
        except ValueError:
            pass
        if json.loads(docker('inspect', '--format', '{{json .State.Running}}', cid)) is not True:
            raise ValueError('embedding-postgres-ended')
        time.sleep(1)
    raise ValueError('embedding-postgres-readiness-timeout')


def capacity(cpu, memory):
    if cpu < 14 or memory['MemTotal'] < 27*GIB or memory['MemAvailable'] < 25*GIB:
        raise ValueError('embedding-index-needs-14-cpu-28-gib-and-25-gib-available')


def build_arguments(name, pg, volume, secrets):
    return ['create', '--name', name, '--pull', 'never', '--network', 'none', '--read-only',
        '--user', '70:70', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--restart', 'no', '--memory', str(24*GIB), '--memory-swap', str(24*GIB), '--cpus', '12',
        '--shm-size', str(22*GIB), '--pids-limit', '192',
        '--label', 'mercurion.embedding.maintenance='+name,
        '--mount', 'type=volume,src='+volume+',dst=/var/lib/postgresql/data,volume-nocopy',
        '--mount', 'type=bind,src='+secrets+',dst=/run/mercurion,readonly',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m,mode=1777',
        '--tmpfs', '/var/run/postgresql:rw,size=16m,uid=70,gid=70,mode=3775',
        '--entrypoint', 'postgres', pg['image'], '-D', '/var/lib/postgresql/data',
        '-c', 'max_worker_processes=12', '-c', 'max_parallel_workers=12']


def lifecycle(pg, volume, secrets, name, build, result, save):
    """Never start two PostgreSQL processes on the data volume, including error paths."""
    original = pg['id']
    temporary = None
    stopped = False
    maintenance_safe = True
    try:
        if docker('ps', '-aq', '--filter', 'name=^/'+name+'$'):
            raise ValueError('embedding-maintenance-container-already-exists')
        if set(docker('ps', '-q', '--no-trunc', '--filter', 'volume='+volume).split()) != {original}:
            raise ValueError('embedding-volume-has-unexpected-writer')
        temporary = docker(*build_arguments(name, pg, volume, secrets))
        if not re.fullmatch('[a-f0-9]{64}', temporary):
            raise ValueError('embedding-maintenance-identity')
        result.update(maintenanceContainerId=temporary, originalContainerId=original, phase='stopping-original-postgres')
        save()
        docker('stop', '--time', '60', original)
        stopped = True
        state = json.loads(docker('inspect', '--format', '{{json .State}}', original))
        if state['Running'] is not False or state['ExitCode'] != 0:
            raise ValueError('embedding-original-postgres-not-cleanly-stopped')
        if docker('ps', '-q', '--no-trunc', '--filter', 'volume='+volume):
            raise ValueError('embedding-volume-still-in-use')
        maintenance_safe = False  # A failed start may still have launched the process.
        docker('start', temporary)
        result.update(containerId=temporary, phase='maintenance-readiness')
        save()
        ready(temporary)
        build(temporary)
    finally:
        if temporary:
            try:
                if json.loads(docker('inspect', '--format', '{{json .State.Running}}', temporary)):
                    docker('stop', '--time', '60', temporary)
                if json.loads(docker('inspect', '--format', '{{json .State.Running}}', temporary)) is not False:
                    raise ValueError('embedding-maintenance-stop-unconfirmed')
                maintenance_safe = True
                docker('rm', temporary)  # No --volumes and no force.
                result['maintenanceRemoved'] = True
            except Exception:
                result['cleanupError'] = 'embedding-maintenance-cleanup-failed'
                save()
        if stopped:
            if not maintenance_safe or docker('ps', '-q', '--no-trunc', '--filter', 'volume='+volume):
                raise ValueError('embedding-volume-not-safe-to-restart-original')
            docker('update', '--memory', str(4*GIB), '--memory-swap', str(4*GIB), '--cpus', '4', original)
            docker('start', original)
            ready(original)
            result.update(containerId=original, originalPostgresRestored=True, ordinaryCpuLimit=4,
                          ordinaryMemoryBytes=4*GIB, resourceLimitsRestored=True)
            save()
        if result.get('cleanupError'):
            raise ValueError('embedding-maintenance-cleanup-failed')


def run(root):
    import fcntl
    if os.geteuid() != 0:
        raise ValueError('embedding-index-root-required')
    for path in (root, *root.parents):
        info = path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise ValueError('embedding-index-untrusted-root')
    lock = os.open('/run/mercurion-embedding-import.lock', os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW, 0o600)
    fcntl.flock(lock, fcntl.LOCK_EX|fcntl.LOCK_NB)
    manifest = json.loads(snapshot.regular(root/'manifest.json'))
    plan = manifest['dataset']
    dataset = manifest['datasetSha256']
    if hashlib.sha256(json.dumps(plan, sort_keys=True, separators=(',', ':')).encode()).hexdigest() != dataset:
        raise ValueError('embedding-index-dataset-hash')
    previous = json.loads(snapshot.regular(root/'import-result.json'))
    if (previous.get('status') != 'passed' or previous.get('datasetSha256') != dataset
            or previous.get('completedChunks') != len(plan['files']) or previous.get('loadedRows') != plan['rowCount']):
        raise ValueError('embedding-complete-import-required')
    result = dict(schemaVersion=1, runId=manifest['runId'], datasetSha256=dataset, mode='index',
        status='running', phase='preflight', valuesPrinted=False, indexBuilt=False)
    def save():
        pending=root/'index-result.pending'
        pending.write_text(json.dumps(result, indent=2));pending.chmod(0o600)
        os.replace(pending, root/'index-result.json')
    save()
    try:
        memory={line.split(':')[0]:int(line.split()[1])*1024 for line in Path('/proc/meminfo').read_text().splitlines()
                if line.startswith(('MemTotal:', 'MemAvailable:'))}
        capacity(os.cpu_count() or 0, memory)
        current=snapshot.inventory(manifest['serverRunId'], manifest['serverManifestSha256'])
        if current['activeUpgradeId'] != manifest['upgradeId']:
            raise ValueError('embedding-active-generation-changed')
        pg=next(item for item in current['containers'] if item['service']=='postgres-preview')
        if not pg['running']:
            raise ValueError('embedding-original-postgres-not-running')
        members=json.loads(snapshot.regular(snapshot.BASE/('server-'+manifest['serverRunId'])/'application-members.json'))
        if members.get('serverRunId') != manifest['serverRunId'] or len(members.get('members', [])) != 4:
            raise ValueError('embedding-application-registry')
        for item in members['members']:
            if not re.fullmatch('[a-f0-9]{64}', item['id']):raise ValueError('embedding-application-identity')
            if json.loads(docker('inspect', '--format', '{{json .State.Running}}', item['id'])) is not False:
                raise ValueError('embedding-stop-applications-before-maintenance')
        records=json.loads(sql(pg['id'], "SELECT coalesce(json_agg(row_to_json(j)),'[]') FROM (SELECT dataset_sha256,chunk_name,chunk_sha256,row_count FROM mercurion_ops.embedding_import_chunks) j;"))
        expected={(dataset, r['name'], r['sha256'], r['rows']) for r in plan['files']}
        actual={(r['dataset_sha256'],r['chunk_name'],r['chunk_sha256'],r['row_count']) for r in records}
        if actual != expected or len(records) != len(plan['files']) or int(sql(pg['id'], 'SELECT count(*) FROM public.molecule_embeddings;')) != plan['rowCount']:
            raise ValueError('embedding-index-journal-or-count-mismatch')
        mounts=pg['mounts']
        data=[m for m in mounts if m['Type']=='volume' and m['Destination']=='/var/lib/postgresql/data' and m['RW']]
        secrets=[m for m in mounts if m['Type']=='bind' and m['Destination']=='/run/mercurion' and not m['RW']]
        if len(data)!=1 or len(secrets)!=1:raise ValueError('embedding-postgres-mount-contract')
        def build(cid):
            result.update(phase='building-index', maintenanceWorkMemBytes=20*GIB, parallelMaintenanceWorkers=11)
            save()
            logfile=root/'private-index-psql.log'
            fd=os.open(logfile, os.O_WRONLY|os.O_CREAT|os.O_APPEND|os.O_NOFOLLOW, 0o600)
            with os.fdopen(fd,'ab') as log:
                sql(cid, "SET maintenance_work_mem='20GB'; SET max_parallel_maintenance_workers=11;\n"+
                    snapshot.regular(root/'30_indexes.sql').decode(), log)
            valid=sql(cid, "SELECT count(*) FROM pg_index WHERE indrelid='public.molecule_embeddings'::regclass AND indisvalid AND indexrelid IN ('public.molecule_embeddings_molregno_key'::regclass,'public.molecule_embeddings_hnsw_cosine'::regclass);")
            if valid!='2':raise ValueError('embedding-index-not-valid')
            sample=sql(cid, 'SELECT embedding::text FROM public.molecule_embeddings ORDER BY molregno LIMIT 1;')
            if not re.fullmatch(r'\[[0-9eE+.,\- ]+\]', sample):raise ValueError('embedding-sample-vector-format')
            explain=sql(cid, "SET enable_seqscan=off; EXPLAIN SELECT molregno FROM public.molecule_embeddings ORDER BY embedding <=> '"+sample+"'::vector LIMIT 10;")
            if 'molecule_embeddings_hnsw_cosine' not in explain:raise ValueError('embedding-hnsw-not-selected')
            result.update(indexBuilt=True, hnswPlanVerified=True)
        lifecycle(pg, data[0]['Name'], secrets[0]['Source'], 'mercurion-hnsw-'+manifest['runId'], build, result, save)
        if int(sql(pg['id'], 'SELECT count(*) FROM public.molecule_embeddings;')) != plan['rowCount']:
            raise ValueError('embedding-final-row-count-mismatch')
        result.update(status='passed', phase='indexed-and-verified', loadedRows=plan['rowCount'])
    except Exception as error:
        result.update(status='failed', errorType=type(error).__name__,
            code=str(error) if isinstance(error,ValueError) and re.fullmatch('[a-z0-9-]+',str(error)) else 'embedding-index-operation-failed')
    finally:
        save();os.close(lock)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',required=True,type=Path)
    args=parser.parse_args()
    raise SystemExit(0 if run(args.root.resolve())['status']=='passed' else 1)
