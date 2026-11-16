-- Separate, expensive phase after all chunks. Run once with ON_ERROR_STOP.
-- Default session memory is conservative; the operator may SET higher values first.
SET lock_timeout='10s';
SET statement_timeout=0;
CREATE UNIQUE INDEX IF NOT EXISTS molecule_embeddings_molregno_key ON public.molecule_embeddings(molregno);
CREATE INDEX IF NOT EXISTS molecule_embeddings_hnsw_cosine ON public.molecule_embeddings
  USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
ANALYZE public.molecule_embeddings;
