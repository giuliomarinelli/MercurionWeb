"""PostgreSQL 16 upgrade: isolated synthetic SQL/dump/pgvector/HNSW/restart tests."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
LEGACY_HASH = '7fb5bb279ef83bf9204bfac7405bb5c9a05e49f5ac7d64d1eb4464d103b80f32'
SETUP = """
CREATE TABLE molecule_embeddings (
  stable_uuid uuid PRIMARY KEY, molregno integer UNIQUE NOT NULL,
  smiles text NOT NULL, embedding vector(384), embedding_model text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO molecule_embeddings(stable_uuid,molregno,smiles,embedding,embedding_model)
SELECT md5(i::text)::uuid, i, 'synthetic-'||i,
 (SELECT array_agg(CASE WHEN d=1 THEN i::float8/1000
                       WHEN d=(i%383)+2 THEN 1::float8 ELSE 0::float8 END ORDER BY d)
  FROM generate_series(1,384) d)::vector,
 'synthetic-384' FROM generate_series(1,256) i;
CREATE INDEX fixture_hnsw ON molecule_embeddings USING hnsw(embedding vector_cosine_ops);
CREATE TABLE fixture_accounts(id uuid PRIMARY KEY, details jsonb NOT NULL, updated_at timestamptz NOT NULL);
INSERT INTO fixture_accounts VALUES ('00000000-0000-0000-0000-000000000001','{"role":"fixture"}',now());
BEGIN;
UPDATE fixture_accounts SET details='{"role":"rolled-back"}';
ROLLBACK;
ANALYZE molecule_embeddings;
"""
NEIGHBORS = """
SET hnsw.ef_search=1000; SET enable_seqscan=off;
SELECT coalesce(json_agg(row_to_json(q)),'[]') FROM (
 SELECT molregno, embedding <=> (SELECT embedding FROM molecule_embeddings WHERE molregno=17)::float8[]::vector AS distance
 FROM molecule_embeddings WHERE molregno<>17
 ORDER BY embedding <=> (SELECT embedding FROM molecule_embeddings WHERE molregno=17)::float8[]::vector
 LIMIT 10) q;
"""


def restore_entries(toc):
    # Only these objects are deliberately pre-created to preserve the source extension version.
    return '\n'.join(line for line in toc.splitlines()
        if not re.search(r' (?:SCHEMA - public|EXTENSION - vector|COMMENT - EXTENSION vector)(?: |$)',line))+'\n'


def smoke(old, candidate, legacy, output):
    if any(not re.fullmatch(r'sha256:[a-f0-9]{64}', image) for image in (old, candidate)):
        raise ValueError('Immutable local images required')
    if hashlib.sha256(legacy.read_bytes()).hexdigest() != LEGACY_HASH:
        raise ValueError('pgvector 0.8.1 SQL checksum mismatch')
    output.mkdir(parents=True, exist_ok=False)
    run = uuid.uuid4().hex
    label = 'mercurion.pg-update=' + run
    containers, volumes = [], []
    result = dict(runId=run, status='failed', phase='preflight', oldImage=old, candidateImage=candidate,
                  syntheticOnly=True, existingDataRead=False, vmChanged=False, checks=[], cleanupErrors=[])

    def docker(*arguments, data=None):
        value = subprocess.run(['docker','--context','desktop-linux',*arguments],
                               input=data,capture_output=True,timeout=180)
        if value.returncode:
            # All inputs and rows belong to synthetic fixtures; no user configuration is loaded.
            (output/'last-docker-error.txt').write_bytes(value.stderr)
            raise RuntimeError('postgres-fixture-docker-operation-failed')
        return value.stdout

    def sql(name, statement, db='fixture'):
        return docker('exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1',
                      '-U','postgres','-d',db,data=statement.encode()).decode().strip()

    def ready(name):
        for _ in range(120):
            try:
                if sql(name,'SELECT 1') == '1':
                    return
            except RuntimeError:
                pass
            time.sleep(.25)
        raise RuntimeError('postgres-fixture-not-ready')

    def create(suffix, image, uid, legacy_mount=False):
        name='pg-update-'+run+'-'+suffix
        volume=name+'-data'
        if docker('volume','ls','-q','--filter','name=^'+volume+'$').strip():
            raise RuntimeError('postgres-fixture-volume-collision')
        docker('volume','create','--label',label,volume)
        volumes.append(volume)
        containers.append(name)
        mounts = ['--mount', 'type=bind,src='+str(legacy.resolve())+',dst=/usr/share/postgresql/16/extension/vector--0.8.1.sql,readonly'] if legacy_mount else []
        docker('run','-d','--pull','never','--name',name,'--label',label,'--network','none',
               '--read-only','--user',uid+':'+uid,'--cap-drop','ALL',
               '--security-opt','no-new-privileges:true','--memory','768m','--cpus','1',
               '--pids-limit','192','--tmpfs','/tmp:rw,noexec,nosuid,size=64m,mode=1777',
               '--tmpfs','/var/run/postgresql:rw,size=16m,uid='+uid+',gid='+uid+',mode=3775',
               '--mount','type=volume,src='+volume+',dst=/var/lib/postgresql/data',*mounts,
               '--env','POSTGRES_DB=fixture','--env','POSTGRES_USER=postgres',
               '--env','POSTGRES_PASSWORD=synthetic-pg-fixture','--env','POSTGRES_HOST_AUTH_METHOD=scram-sha-256',
               '--env','POSTGRES_INITDB_ARGS=--locale=C --encoding=UTF8',
               image,'postgres','-c','listen_addresses=127.0.0.1','-c','shared_buffers=64MB','-c','max_connections=20')
        ready(name)
        return name

    def verify(name, expected_version):
        if sql(name,"SELECT extversion FROM pg_extension WHERE extname='vector'") != expected_version:
            raise RuntimeError('postgres-fixture-extension-catalog-changed')
        if sql(name,'SELECT count(*) FROM molecule_embeddings') != '256':
            raise RuntimeError('postgres-fixture-row-loss')
        if sql(name,"SELECT details->>'role' FROM fixture_accounts") != 'fixture':
            raise RuntimeError('postgres-fixture-transaction-or-jsonb-regression')
        if sql(name,"SELECT count(*) FROM pg_index WHERE indexrelid='fixture_hnsw'::regclass AND indisvalid") != '1':
            raise RuntimeError('postgres-fixture-index-invalid')
        return json.loads(sql(name,NEIGHBORS))

    try:
        for image in (old,candidate):
            info=json.loads(docker('image','inspect',image))[0]
            if info['Id'] != image or (info['Os'],info['Architecture']) != ('linux','amd64'):
                raise ValueError('postgres-fixture-image-identity-mismatch')
        result['phase']='old-engine-fixture'
        source=create('source',old,'999',legacy_mount=True)
        old_version=sql(source,'SHOW server_version')
        sql(source,"CREATE EXTENSION vector VERSION '0.8.1';"+SETUP)
        expected=verify(source,'0.8.1')
        result['checks'].append('old catalog 0.8.1, SQL types, transaction rollback and cosine HNSW fixture')
        result['phase']='logical-dump'
        archive=docker('exec',source,'pg_dump','-U','postgres','-d','fixture','-Fc','--no-owner','--no-privileges')
        (output/'synthetic.dump').write_bytes(archive)
        result['dumpSha256']=hashlib.sha256(archive).hexdigest()
        result['phase']='candidate-restore'
        target=create('candidate',candidate,'70')
        new_version=sql(target,'SHOW server_version')
        if not old_version.startswith('16.10') or not new_version.startswith('16.16'):
            raise RuntimeError('postgres-fixture-unexpected-engine-version')
        for name in (source,target):
            success=docker('exec','--env','PGPASSWORD=synthetic-pg-fixture',name,'psql',
                           '-h','127.0.0.1','-U','postgres','-d','fixture','-XAt','-c','SELECT 1')
            if success.strip()!=b'1':
                raise RuntimeError('postgres-fixture-scram-login-failed')
            denied=subprocess.run(['docker','--context','desktop-linux','exec','--env','PGPASSWORD=wrong-fixture-password',
                 name,'psql','-h','127.0.0.1','-U','postgres','-d','fixture','-XAt','-c','SELECT 1'],
                 capture_output=True,timeout=15)
            if denied.returncode==0 or b'password authentication failed' not in denied.stderr:
                raise RuntimeError('postgres-fixture-scram-denial-failed')
        result['checks'].append('SCRAM-SHA-256 accepts synthetic password and rejects incorrect password on both engines')
        sql(target,"CREATE EXTENSION vector VERSION '0.8.1';")
        toc=docker('exec','-i',target,'pg_restore','--list',data=archive).decode()
        # Preinstall vector explicitly at the source catalog version; retain all table/data/index entries.
        restore_list=restore_entries(toc)
        docker('exec','-i',target,'sh','-c','cat > /tmp/fixture-restore.list',data=restore_list.encode())
        docker('exec','-i',target,'pg_restore','-U','postgres','-d','fixture','--exit-on-error',
               '--no-owner','--no-privileges','--use-list=/tmp/fixture-restore.list',data=archive)
        actual=verify(target,'0.8.1')
        if [r['molregno'] for r in actual] != [r['molregno'] for r in expected] or any(
                abs(a['distance']-b['distance'])>1e-6 for a,b in zip(actual,expected)):
            raise RuntimeError('postgres-fixture-neighbor-regression')
        result['checks'].append('16.10 dump restored on 16.16; rows, UUID/JSONB/timestamptz, pgvector 0.8.1 and nearest neighbors preserved')
        plan=sql(target,"SET enable_seqscan=off; EXPLAIN SELECT molregno FROM molecule_embeddings ORDER BY embedding <=> '[1,0"+",0"*382+"]'::vector LIMIT 5")
        if 'fixture_hnsw' not in plan:
            raise RuntimeError('postgres-fixture-hnsw-not-used')
        result['checks'].append('HNSW index selected by query planner')
        result['phase']='candidate-restart'
        docker('restart','--time','30',target)
        ready(target)
        if verify(target,'0.8.1') != actual:
            raise RuntimeError('postgres-fixture-restart-regression')
        result['checks'].append('restart preserves restored data and catalog version')
        sql(target,'CREATE DATABASE fresh_fixture',db='postgres')
        fresh=sql(target,"CREATE EXTENSION vector; SELECT extversion FROM pg_extension WHERE extname='vector'",db='fresh_fixture')
        if fresh != '0.8.7':
            raise RuntimeError('postgres-fixture-default-extension-unexpected')
        result['checks'].append('new database explicitly verified at default pgvector 0.8.7')
        if verify(source,'0.8.1') != expected:
            raise RuntimeError('postgres-fixture-source-changed')
        result.update(status='passed',phase='finished',oldServerVersion=old_version,
                      candidateServerVersion=new_version,preservedCatalogVersion='0.8.1',defaultExtensionVersion='0.8.7')
    except Exception as error:
        result['errorType']=type(error).__name__
    finally:
        for kind,ids in (('container',reversed(containers)),('volume',reversed(volumes))):
            for identifier in ids:
                try:
                    info=json.loads(docker('inspect','--type',kind,identifier))[0]
                    labels=info.get('Config',info).get('Labels',{}) or {}
                    if labels.get('mercurion.pg-update') != run:
                        raise RuntimeError('postgres-fixture-cleanup-ownership-mismatch')
                    docker('rm','--force',identifier) if kind=='container' else docker('volume','rm',identifier)
                except Exception:
                    result['cleanupErrors'].append(kind+'-cleanup-failed')
        if result['cleanupErrors']:
            result['status']='failed'
        (output/'compatibility.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--old-image',required=True)
    parser.add_argument('--candidate-image',required=True)
    parser.add_argument('--legacy-sql',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--execute',required=True,action='store_true')
    args=parser.parse_args()
    result=smoke(args.old_image,args.candidate_image,args.legacy_sql,args.output.resolve())
    print(json.dumps(result))
    raise SystemExit(0 if result['status']=='passed' else 1)
