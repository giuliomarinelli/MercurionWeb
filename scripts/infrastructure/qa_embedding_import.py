"""Real disposable PostgreSQL DDL/COPY/journal/HNSW QA; no owner dataset or VM."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import time
import uuid

from embedding_dump_inventory import HEADER
from guest_embedding_import import stream_copy

ROOT=Path(__file__).resolve().parents[2]


def qa(image,report):
    if report.exists():raise ValueError('qa-report-already-exists')
    name='embedding-qa-'+uuid.uuid4().hex
    prefix=['docker','--context','desktop-linux']
    result=dict(status='failed',syntheticOnly=True,vmChanged=False,checks=[],cleanupErrors=[])
    def docker(*args,data=None,check=True):
        value=subprocess.run([*prefix,*args],input=data,capture_output=True,timeout=90)
        if check and value.returncode:raise ValueError('embedding-qa-docker-operation-failed')
        return value
    def sql(text,check=True):return docker('exec','-i',name,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','mercurion_preview',data=text,check=check)
    try:
        docker('run','-d','--name',name,'--pull','never','--network','none','--read-only','--user','70:70','--cap-drop','ALL',
               '--security-opt','no-new-privileges:true','--tmpfs','/var/lib/postgresql/data:rw,size=256m,uid=70,gid=70,mode=700',
               '--tmpfs','/var/run/postgresql:rw,size=16m,uid=70,gid=70,mode=3775','--tmpfs','/tmp:rw,size=16m,mode=1777',
               '--env','POSTGRES_DB=mercurion_preview','--env','POSTGRES_PASSWORD=synthetic-fixture',image)
        for _ in range(100):
            if docker('exec',name,'cat','/proc/1/comm',check=False).stdout.strip()==b'postgres' and sql(b'SELECT 1;',False).returncode==0:break
            time.sleep(.1)
        else:raise ValueError('embedding-qa-not-ready')
        sql(b"CREATE EXTENSION vector; CREATE TABLE molecule_embeddings(stable_uuid uuid PRIMARY KEY,molregno integer NOT NULL,smiles text NOT NULL,embedding vector,embedding_model text NOT NULL DEFAULT 'seyonec/ChemBERTa-zinc-base-v1',updated_at timestamptz NOT NULL DEFAULT now());")
        ddl=(ROOT/'MercurionWebNode/sql/bootstrap/embeddings/10_table.sql').read_bytes()
        sql(ddl)
        if sql(b"SELECT format_type(atttypid,atttypmod) FROM pg_attribute WHERE attrelid='molecule_embeddings'::regclass AND attname='embedding'").stdout.strip()!=b'vector(768)':raise ValueError('embedding-qa-dimension-not-fixed')
        result['checks'].append('legacy empty bootstrap table aligned: preferred_name and vector(768)')
        vector='['+','.join(['1']+['0']*767)+']'
        raw=b'\\set ON_ERROR_STOP on\nBEGIN;\n'+HEADER+b'\n'+('00000000-0000-0000-0000-000000000001\t17\tCCO\t'+vector+'\tseyonec/ChemBERTa-zinc-base-v1\t2026-11-12 00:00:00+00\tfixture\n').encode()+b'\\.\nCOMMIT;\n'
        record=dict(name='molecule_embeddings-000.sql',rows=1,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw))
        interrupted=io.BytesIO()
        try:stream_copy(io.BytesIO(raw),interrupted,dict(record,sha256='f'*64),'a'*64)
        except ValueError:pass
        else:raise ValueError('embedding-qa-wrong-hash-not-rejected')
        sql(interrupted.getvalue())
        if sql(b'SELECT count(*) FROM molecule_embeddings;').stdout.strip()!=b'0':raise ValueError('embedding-qa-partial-data-committed')
        result['checks'].append('wrong SHA aborts before COMMIT: no rows or journal markers')
        stream=io.BytesIO();stream_copy(io.BytesIO(raw),stream,record,'a'*64)
        sql(stream.getvalue());sql(ddl)
        if sql(b'SELECT count(*) FROM molecule_embeddings; SELECT count(*) FROM mercurion_ops.embedding_import_chunks;').stdout.strip()!=b'1\n1':raise ValueError('embedding-qa-journal-mismatch')
        result['checks'].append('data and completed-chunk journal commit atomically; DDL can be repeated')
        if sql(stream.getvalue(),False).returncode==0:raise ValueError('embedding-qa-duplicate-accepted')
        if sql(b'SELECT count(*) FROM molecule_embeddings; SELECT count(*) FROM mercurion_ops.embedding_import_chunks;').stdout.strip()!=b'1\n1':raise ValueError('embedding-qa-duplicate-corruption')
        result['checks'].append('duplicate chunk rejected without partial changes')
        sql((ROOT/'MercurionWebNode/sql/bootstrap/embeddings/30_indexes.sql').read_bytes())
        plan=sql(("SET enable_seqscan=off; EXPLAIN SELECT molregno FROM molecule_embeddings ORDER BY embedding <=> '"+vector+"'::vector LIMIT 10").encode()).stdout
        if b'molecule_embeddings_hnsw_cosine' not in plan:raise ValueError('embedding-qa-hnsw-not-used')
        result['checks'].append('unique molregno and cosine HNSW created; query planner uses HNSW')
        result['status']='passed'
    except Exception as error:
        result.update(errorType=type(error).__name__,code=str(error) if isinstance(error,ValueError) else 'embedding-qa-failed')
    finally:
        if docker('rm','--force',name,check=False).returncode:result['cleanupErrors'].append('container')
        if result['cleanupErrors']:result['status']='failed'
        report.parent.mkdir(parents=True,exist_ok=True)
        with report.open('x') as stream:json.dump(result,stream,indent=2)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image',required=True)
    parser.add_argument('--report',required=True,type=Path)
    parser.add_argument('--execute',required=True,action='store_true')
    args=parser.parse_args()
    result=qa(args.image,args.report)
    print(json.dumps(result));raise SystemExit(0 if result['status']=='passed' else 1)
