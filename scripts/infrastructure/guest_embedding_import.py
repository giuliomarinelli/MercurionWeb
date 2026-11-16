"""Journaled embedding COPY import and separate HNSW phase on the adopted PostgreSQL volume."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import time

sys.path.insert(0,str(Path(__file__).resolve().parent))
import guest_preview_recovery_inventory as snapshot
from embedding_dump_inventory import HEADER


def digest_file(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(4*1024*1024),b''):h.update(block)
    return h.hexdigest()


def stream_copy(source,destination,record,dataset):
    if (not re.fullmatch('[a-f0-9]{64}',dataset) or not re.fullmatch(r'molecule_embeddings-[0-9]{3}\.sql',record['name'])
            or not re.fullmatch('[a-f0-9]{64}',record['sha256'])):raise ValueError('embedding-chunk-identifiers')
    h=hashlib.sha256()
    def read():
        raw=source.readline(1024*1024+1)
        if len(raw)>1024*1024:raise ValueError('embedding-line-too-large')
        h.update(raw);return raw
    if [read().rstrip(b'\r\n') for _ in range(3)]!=[b'\\set ON_ERROR_STOP on',b'BEGIN;',HEADER]:
        raise ValueError('embedding-chunk-header')
    destination.write(b'\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL lock_timeout=\'10s\';\nSELECT pg_advisory_xact_lock(148048,768);\n'+HEADER+b'\n')
    count=0
    while True:
        line=read()
        if line.rstrip(b'\r\n')==b'\\.':
            destination.write(b'\\.\n');break
        if not line or len(line.split(b'\t'))!=7:raise ValueError('embedding-copy-row-shape')
        destination.write(line);count+=1
    if read().rstrip(b'\r\n')!=b'COMMIT;':raise ValueError('embedding-chunk-trailer')
    while True:
        tail=source.read(1024*1024)
        if not tail:break
        h.update(tail)
        if tail.strip():raise ValueError('embedding-extra-sql-not-allowed')
    if count!=record['rows'] or h.hexdigest()!=record['sha256']:
        raise ValueError('embedding-chunk-hash-or-count-mismatch')
    # These identifiers and hashes are validated before reaching this point.
    marker=("INSERT INTO mercurion_ops.embedding_import_chunks(dataset_sha256,chunk_name,chunk_sha256,row_count) VALUES ('"
            +dataset+"','"+record['name']+"','"+record['sha256']+"',"+str(count)+");\nCOMMIT;\n")
    destination.write(marker.encode())
    return count


def run(root,mode):
    import fcntl
    if os.geteuid()!=0:raise ValueError('embedding-root-required')
    for path in (root,*root.parents):
        info=path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid!=0 or info.st_mode&0o022:raise ValueError('embedding-protected-run')
    manifest=json.loads((root/'manifest.json').read_text())
    plan=manifest['dataset'];dataset=manifest['datasetSha256']
    if hashlib.sha256(json.dumps(plan,sort_keys=True,separators=(',',':')).encode()).hexdigest()!=dataset:
        raise ValueError('embedding-dataset-manifest-hash')
    if len(plan['dimensions'])!=1 or list(plan['dimensions'])!=['768'] or plan['table']!='public.molecule_embeddings':
        raise ValueError('embedding-dataset-contract')
    for i,record in enumerate(plan['files']):
        if (record['name']!='molecule_embeddings-'+str(i).zfill(3)+'.sql' or not re.fullmatch('[a-f0-9]{64}',record['sha256'])
                or not isinstance(record['rows'],int) or record['rows']<=0):raise ValueError('embedding-chunk-manifest')
    lock=os.open('/run/mercurion-embedding-import.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    current=snapshot.inventory(manifest['serverRunId'],manifest['serverManifestSha256'])
    if current['activeUpgradeId']!=manifest['upgradeId']:raise ValueError('embedding-active-generation-changed')
    pg=next(c for c in current['containers'] if c['service']=='postgres-preview')
    if not pg['running']:raise ValueError('embedding-postgres-not-running')
    cid=pg['id']
    prefix=['docker','--host','unix:///var/run/docker.sock']
    shell='export PGPASSWORD="$(cat /run/mercurion/application-password)"; exec psql -X -qAt -v ON_ERROR_STOP=1 -h 127.0.0.1 -U mercurion_preview -d mercurion_preview'
    def sql(text):
        value=subprocess.run([*prefix,'exec','-i',cid,'sh','-c',shell],input=text.encode(),capture_output=True,timeout=180)
        if value.returncode:raise ValueError('embedding-sql-preflight-failed')
        return value.stdout.decode().strip()
    result=dict(schemaVersion=1,runId=manifest['runId'],datasetSha256=dataset,mode=mode,status='running',
                completedChunks=0,loadedRows=0,expectedRows=plan['rowCount'],containerId=cid,phase='preflight',valuesPrinted=False)
    report=root/(mode+'-result.json')
    def save():
        tmp=root/(mode+'-result.pending')
        tmp.write_text(json.dumps(result,indent=2));os.chmod(tmp,0o644);os.replace(tmp,report)
    old_limits=None
    try:
        if mode=='import':
            docker_root=subprocess.check_output([*prefix,'info','--format','{{.DockerRootDir}}'],text=True).strip()
            space=os.statvfs(docker_root)
            if space.f_bavail*space.f_frsize<plan['bytes']*2+12*1024**3:
                raise ValueError('embedding-insufficient-data-wal-index-space')
        if mode=='import':
            with (root/'10_table.sql').open('rb') as stream:ddl=stream.read().decode()
            sql(ddl)
        rows=int(sql('SELECT count(*) FROM public.molecule_embeddings;'))
        records=json.loads(sql("SELECT coalesce(json_agg(row_to_json(j)),'[]') FROM (SELECT dataset_sha256,chunk_name,chunk_sha256,row_count FROM mercurion_ops.embedding_import_chunks) j;"))
        if any(r['dataset_sha256']!=dataset for r in records):raise ValueError('embedding-other-dataset-already-present')
        imported={r['chunk_name']:r for r in records}
        expected_names={r['name'] for r in plan['files']}
        if not set(imported)<=expected_names or sum(r['row_count'] for r in records)!=rows:
            raise ValueError('embedding-existing-rows-not-reconciled')
        result.update(loadedRows=rows,completedChunks=len(imported))
        if mode=='import':
            result['phase']='copy';save()
            for record in plan['files']:
                if record['name'] in imported:
                    prior=imported[record['name']]
                    if prior['chunk_sha256']!=record['sha256'] or prior['row_count']!=record['rows']:
                        raise ValueError('embedding-completed-chunk-mismatch')
                    continue
                path=Path(manifest['chunkDirectory'])/record['name']
                fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
                with os.fdopen(fd,'rb') as source:
                    info=os.fstat(source.fileno())
                    if not stat.S_ISREG(info.st_mode) or info.st_size!=record['bytes']:raise ValueError('embedding-chunk-file-shape')
                    with (root/'private-psql.log').open('ab') as log:
                        os.chmod(root/'private-psql.log',0o600)
                        process=subprocess.Popen([*prefix,'exec','-i',cid,'sh','-c',shell],stdin=subprocess.PIPE,stdout=log,stderr=log)
                        try:
                            stream_copy(source,process.stdin,record,dataset)
                            process.stdin.close();code=process.wait(timeout=1800)
                            if code:raise ValueError('embedding-chunk-copy-failed')
                        except BaseException:
                            if process.stdin and not process.stdin.closed:process.stdin.close()
                            try:process.wait(timeout=30)
                            except subprocess.TimeoutExpired:process.terminate()
                            raise
                result['completedChunks']+=1;result['loadedRows']+=record['rows'];result['lastChunk']=record['name'];save()
            if int(sql('SELECT count(*) FROM public.molecule_embeddings;'))!=plan['rowCount']:
                raise ValueError('embedding-final-row-count-mismatch')
            result.update(status='passed',phase='data-loaded',indexBuilt=False);save()
        else:
            if rows!=plan['rowCount'] or len(imported)!=len(plan['files']):raise ValueError('embedding-all-chunks-required-before-index')
            for record in plan['files']:
                prior=imported[record['name']]
                if prior['chunk_sha256']!=record['sha256'] or prior['row_count']!=record['rows']:
                    raise ValueError('embedding-completed-chunk-mismatch')
            result['phase']='building-index';save()
            # Bound maintenance to available guest memory. Preserve limits for finally.
            memory={line.split(':')[0]:int(line.split()[1])*1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith(('MemTotal:','MemAvailable:'))}
            if memory['MemAvailable']<6*1024**3:raise ValueError('embedding-index-needs-six-gib-available')
            old_limits=json.loads(subprocess.check_output([*prefix,'inspect','--format','{"Memory":{{.HostConfig.Memory}},"MemorySwap":{{.HostConfig.MemorySwap}},"NanoCpus":{{.HostConfig.NanoCpus}}}',cid]))
            subprocess.run([*prefix,'update','--memory',str(10*1024**3),'--memory-swap',str(10*1024**3),'--cpus','4',cid],check=True,capture_output=True)
            with (root/'private-psql.log').open('ab') as log:
                text="SET maintenance_work_mem='4GB'; SET max_parallel_maintenance_workers=2;\n"+(root/'30_indexes.sql').read_text()
                outcome=subprocess.run([*prefix,'exec','-i',cid,'sh','-c',shell],input=text.encode(),stdout=log,stderr=log)
                if outcome.returncode:raise ValueError('embedding-index-build-failed')
            valid=int(sql("SELECT count(*) FROM pg_index WHERE indrelid='public.molecule_embeddings'::regclass AND indisvalid AND indexrelid IN ('public.molecule_embeddings_molregno_key'::regclass,'public.molecule_embeddings_hnsw_cosine'::regclass);"))
            if valid!=2:raise ValueError('embedding-index-not-valid')
            sample=sql('SELECT embedding::text FROM public.molecule_embeddings ORDER BY molregno LIMIT 1;')
            if not re.fullmatch(r'\[[0-9eE+.,\- ]+\]',sample):raise ValueError('embedding-sample-vector-format')
            explain=sql("SET enable_seqscan=off; EXPLAIN SELECT molregno FROM public.molecule_embeddings ORDER BY embedding <=> '"+sample+"'::vector LIMIT 10;")
            if 'molecule_embeddings_hnsw_cosine' not in explain:raise ValueError('embedding-hnsw-not-selected')
            result.update(status='passed',phase='indexed-and-verified',indexBuilt=True,hnswPlanVerified=True);save()
    except Exception as error:
        result.update(status='failed',errorType=type(error).__name__,code=str(error) if isinstance(error,ValueError) and re.fullmatch('[a-z0-9-]+',str(error)) else 'embedding-operation-failed')
        save()
    finally:
        if old_limits:
            args=[*prefix,'update','--memory',str(old_limits['Memory']),'--memory-swap',str(old_limits['MemorySwap']),'--cpus',str(old_limits['NanoCpus']/1e9),cid]
            if subprocess.run(args,capture_output=True).returncode:
                result.update(status='failed',code='embedding-resource-limit-restore-failed')
            else:result['resourceLimitsRestored']=True
            save()
        os.close(lock)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',required=True,type=Path)
    parser.add_argument('--mode',required=True,choices=('import','index'))
    args=parser.parse_args()
    signal.signal(signal.SIGHUP,signal.SIG_IGN)
    try:result=run(args.root.resolve(),args.mode)
    except Exception as error:
        result=dict(status='failed',mode=args.mode,errorType=type(error).__name__,
                    code=str(error) if isinstance(error,ValueError) and re.fullmatch('[a-z0-9-]+',str(error)) else 'embedding-worker-preflight-failed')
        if os.geteuid()==0 and args.root.is_dir() and args.root.lstat().st_uid==0:
            (args.root/(args.mode+'-result.json')).write_text(json.dumps(result,indent=2))
    raise SystemExit(0 if result['status']=='passed' else 1)
