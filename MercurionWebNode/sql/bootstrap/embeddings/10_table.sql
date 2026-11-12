-- Run with psql -v ON_ERROR_STOP=1 against mercurion_preview, before the first chunk.
-- Baseline DDL, not an application-start migration. Existing rows are never deleted.
BEGIN;
SELECT pg_advisory_xact_lock(148048, 768);
DO $$
BEGIN
  IF current_database() <> 'mercurion_preview' THEN RAISE EXCEPTION 'Wrong embeddings database'; END IF;
  IF current_setting('server_version_num')::integer < 160016 THEN RAISE EXCEPTION 'PostgreSQL 16.16 required'; END IF;
  IF (SELECT extversion FROM pg_extension WHERE extname='vector') IS DISTINCT FROM '0.8.7' THEN
    RAISE EXCEPTION 'Expected existing pgvector 0.8.7';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.molecule_embeddings (
  stable_uuid uuid PRIMARY KEY,
  molregno integer NOT NULL,
  smiles text NOT NULL,
  embedding vector(768),
  embedding_model text NOT NULL DEFAULT 'seyonec/ChemBERTa-zinc-base-v1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  preferred_name text
);
ALTER TABLE public.molecule_embeddings ADD COLUMN IF NOT EXISTS preferred_name text;
DO $$
DECLARE bad integer;
BEGIN
 SELECT count(*) INTO bad FROM (VALUES
   ('stable_uuid','uuid',true),('molregno','integer',true),('smiles','text',true),
   ('embedding_model','text',true),('updated_at','timestamp with time zone',true),('preferred_name','text',false)
 ) AS wanted(name,kind,required)
 LEFT JOIN pg_attribute a ON a.attrelid='public.molecule_embeddings'::regclass AND a.attname=wanted.name AND NOT a.attisdropped
 WHERE a.attname IS NULL OR format_type(a.atttypid,a.atttypmod) <> wanted.kind OR a.attnotnull <> wanted.required;
 IF bad<>0 THEN RAISE EXCEPTION 'Embedding columns differ from the dump contract'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid='public.molecule_embeddings'::regclass
   AND a.attname='embedding' AND NOT a.attisdropped AND format_type(a.atttypid,a.atttypmod) IN ('vector','vector(768)')) THEN
   RAISE EXCEPTION 'Embedding vector type mismatch';
 END IF;
 IF (SELECT format_type(a.atttypid,a.atttypmod) FROM pg_attribute a WHERE a.attrelid='public.molecule_embeddings'::regclass AND a.attname='embedding')='vector' THEN
   IF EXISTS(SELECT 1 FROM public.molecule_embeddings LIMIT 1) THEN RAISE EXCEPTION 'Refusing vector type change on populated table'; END IF;
   ALTER TABLE public.molecule_embeddings ALTER COLUMN embedding TYPE vector(768);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attname='stable_uuid'
   WHERE c.conrelid='public.molecule_embeddings'::regclass AND c.contype='p' AND c.conkey=ARRAY[a.attnum]) THEN
   RAISE EXCEPTION 'Expected stable_uuid primary key';
 END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS mercurion_ops;
CREATE TABLE IF NOT EXISTS mercurion_ops.embedding_import_chunks (
  dataset_sha256 text NOT NULL CHECK(dataset_sha256 ~ '^[a-f0-9]{64}$'),
  chunk_name text NOT NULL CHECK(chunk_name ~ '^molecule_embeddings-[0-9]{3}\.sql$'),
  chunk_sha256 text NOT NULL CHECK(chunk_sha256 ~ '^[a-f0-9]{64}$'),
  row_count bigint NOT NULL CHECK(row_count >= 0),
  finished_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(dataset_sha256,chunk_name)
);
COMMIT;
