"""Compose reviewed pg_dump DDL into a preview-only transactional rebuild.

Reads only the two schema-only exports next to this file's output. Does not
connect to any database. Embeddings and migration/legacy tables are excluded.
"""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT/'MercurionWebNode/sql/bootstrap/application'
EXCLUDED = {'molecule_embeddings', 'lab_notebooks_old', 'typeorm_migrations'}
HEADER = re.compile(r'^--\n-- Name: (.*?); Type: (.*?); Schema: (.*?); Owner:.*?\n--\n', re.M)


def objects(text):
    matches = list(HEADER.finditer(text))
    if not matches:
        raise ValueError('pg-dump-object-headers-missing')
    result = []
    for n, match in enumerate(matches):
        body = text[match.end():matches[n+1].start() if n+1 < len(matches) else len(text)]
        body = re.sub(r'(?m)^\\(?:un)?restrict[^\n]*\n?', '', body)
        result.append((*match.groups(), body.strip()))
    return result


def included(obj):
    name, kind, schema, body = obj
    if schema != 'public' or kind == 'SCHEMA' or name == 'SCHEMA public':
        return False
    if any(re.search(r'\bpublic\.'+re.escape(table)+r'\b', body) for table in EXCLUDED):
        return False
    if 'typeorm_migrations_id_seq' in body:
        return False
    return True


def build(directory=DIRECTORY):
    source = (directory/'development-schema.pg_dump.sql').read_text(encoding='utf-8')
    remote = (directory/'preview-schema-before-rebuild-20261113.sql').read_text(encoding='utf-8')
    development, existing = objects(source), objects(remote)
    selected = [obj for obj in development if included(obj)]
    selected += [obj for obj in existing if re.search(r'\bpublic\.storage_operations\b', obj[3])]
    expected_tables = sorted({name for name, kind, _, _ in selected if kind == 'TABLE'})
    if len(expected_tables) != 33 or set(expected_tables)&EXCLUDED:
        raise ValueError('reviewed-table-contract-changed')
    existing_tables = {name for name, kind, _, _ in existing if kind == 'TABLE'}
    if existing_tables-{'molecule_embeddings'}-set(expected_tables):
        raise ValueError('unexpected-remote-table-review-required')
    types = sorted({name for name, kind, _, _ in [*selected, *existing] if kind == 'TYPE'})
    sequences = sorted({name for name, kind, _, _ in [*selected, *existing] if kind == 'SEQUENCE'})
    functions = sorted({name for name, kind, _, _ in selected if kind == 'FUNCTION'})
    provenance = {name:hashlib.sha256((directory/name).read_bytes()).hexdigest() for name in
                  ('development-schema.pg_dump.sql','preview-schema-before-rebuild-20261113.sql')}
    ddl = '-- DDL da pg_dump reale; nessun synchronize TypeORM. Eseguire tramite 20_rebuild_preview_application.sql.\n'
    for name, kind, _, body in selected:
        ddl += '\n-- '+kind+': '+name+'\n'+re.sub(r'(?m)^SET ', 'SET LOCAL ', body)+'\n'
    (directory/'10_create_application.sql').write_text(ddl,encoding='utf-8')
    names = ',\n  '.join('public.'+name for name in expected_tables)
    array = 'ARRAY['+','.join("'"+name+"'" for name in expected_tables)+']::text[]'
    prefix = '''-- RESET APPLICATIVO PREVIEW: elimina le tabelle elencate e tutti i loro dati.
-- Preserva public.molecule_embeddings e TUTTI i suoi indici; niente CASCADE.
-- In pgAdmin eseguire il file INTERO, Auto-commit attivo, applicazioni ferme.
-- Qualsiasi errore prima del COMMIT annulla il reset; eseguire ROLLBACK se necessario.
BEGIN;
-- Stesso proprietario applicativo attuale, anche se pgAdmin usa postgres.
SET LOCAL ROLE mercurion_preview;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = 0;
SET LOCAL search_path = public, pg_catalog;
SET LOCAL check_function_bodies = false;
SELECT pg_advisory_xact_lock(148048, 769);
DO $guard$
DECLARE unexpected text;
BEGIN
 IF current_database() <> 'mercurion_preview' THEN
  RAISE EXCEPTION 'Database errato: richiesto mercurion_preview';
 END IF;
 IF to_regclass('public.molecule_embeddings') IS NULL THEN
  RAISE EXCEPTION 'Tabella embeddings assente: reset rifiutato';
 END IF;
 SELECT string_agg(tablename, ', ' ORDER BY tablename) INTO unexpected
 FROM pg_tables WHERE schemaname='public'
 AND tablename <> 'molecule_embeddings' AND NOT tablename = ANY(__TABLES__);
 IF unexpected IS NOT NULL THEN
  RAISE EXCEPTION 'Tabelle inattese, nessuna rimozione: %', unexpected;
 END IF;
 IF to_regclass('public.users') IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
   RAISE EXCEPTION 'Esistono utenti: reset rifiutato, verificare prima i dati';
  END IF;
 END IF;
END $guard$;
-- Gli indici trigrammi del DDL dev richiedono questa estensione trusted.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
LOCK TABLE public.molecule_embeddings IN ACCESS SHARE MODE;
CREATE TEMP TABLE embedding_objects_before ON COMMIT DROP AS
 SELECT c.oid, c.relname, c.relkind, pg_relation_filenode(c.oid) AS filenode,
        i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) AS definition
 FROM pg_class c LEFT JOIN pg_index i ON i.indexrelid=c.oid
 WHERE c.oid='public.molecule_embeddings'::regclass
 OR c.oid IN (SELECT indexrelid FROM pg_index WHERE indrelid='public.molecule_embeddings'::regclass);
'''.replace('__TABLES__',array)
    drops = '\nDROP TABLE IF EXISTS\n  '+names+'\nRESTRICT;\n'
    for name in functions:
        if not re.fullmatch('[a-z_]+\\(\\)',name):raise ValueError('unexpected-function-signature')
        drops += 'DROP FUNCTION IF EXISTS public.'+name+' RESTRICT;\n'
    for name in sequences:
        drops += 'DROP SEQUENCE IF EXISTS public.'+name+' RESTRICT;\n'
    for name in types:
        drops += 'DROP TYPE IF EXISTS public.'+name+' RESTRICT;\n'
    suffix = '''
-- Nessun oggetto embeddings deve essere stato rimosso, ricreato o invalidato.
DO $verify$
BEGIN
 IF EXISTS (
  SELECT 1 FROM embedding_objects_before old
  LEFT JOIN pg_class c ON c.oid=old.oid
  LEFT JOIN pg_index i ON i.indexrelid=c.oid
  WHERE c.oid IS NULL OR c.relname IS DISTINCT FROM old.relname
   OR pg_relation_filenode(c.oid) IS DISTINCT FROM old.filenode
   OR i.indisvalid IS DISTINCT FROM old.indisvalid
   OR i.indisready IS DISTINCT FROM old.indisready
   OR pg_get_indexdef(i.indexrelid) IS DISTINCT FROM old.definition
 ) THEN RAISE EXCEPTION 'Verifica embeddings fallita: transazione annullata'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public'
       AND tablename=ANY(__TABLES__)) <> 33 THEN
  RAISE EXCEPTION 'Numero tabelle applicative inatteso';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_attrdef d
     ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid='public.users'::regclass AND a.attname='created_at')
 OR NOT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_attrdef d
     ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid='public.users'::regclass AND a.attname='updated_at') THEN
  RAISE EXCEPTION 'Default utenti assenti';
 END IF;
END $verify$;
COMMIT;
SELECT 'APPLICATION_SCHEMA_REBUILT_EMBEDDINGS_PRESERVED' AS status;
'''.replace('__TABLES__',array)
    (directory/'20_rebuild_preview_application.sql').write_text(prefix+drops+'\n'+ddl+suffix,encoding='utf-8')
    manifest=dict(tables=expected_tables,sourceSha256=provenance,preserved=['public.molecule_embeddings','all embedding indexes'],
                  excludedLegacy=sorted(EXCLUDED-{'molecule_embeddings'}),retainedRemoteTable='storage_operations')
    (directory/'rebuild-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(status='sql-prepared-not-executed',tableCount=len(expected_tables),functionCount=len(functions))))


if __name__=='__main__':
    build()
