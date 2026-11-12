-- Read-only summary; compare row count to the input manifest.
SELECT count(*) AS rows, count(DISTINCT molregno) AS molecules,
       count(*) FILTER (WHERE embedding IS NULL) AS missing_embeddings,
       min(vector_dims(embedding)) AS min_dimensions,
       max(vector_dims(embedding)) AS max_dimensions,
       count(DISTINCT embedding_model) AS models
FROM public.molecule_embeddings;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='molecule_embeddings' ORDER BY indexname;
SELECT chunk_name,row_count,finished_at FROM mercurion_ops.embedding_import_chunks ORDER BY chunk_name;
