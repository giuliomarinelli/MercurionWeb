-- Letture dopo COMMIT; non modificano dati o schema.
SELECT current_database() AS database, current_user AS utente;

SELECT table_name,column_name,column_default,is_nullable
FROM information_schema.columns
WHERE table_schema='public'
 AND ((table_name='users' AND column_name IN ('created_at','updated_at'))
   OR (table_name IN ('documents','history','molecule_collections','molecule_collection_items')
       AND column_name IN ('scope','is_active','flag_ids','properties','touched_at')))
ORDER BY table_name,column_name;

SELECT i.indexrelid::regclass AS indice,i.indisvalid AS valido,i.indisready AS pronto,
       pg_size_pretty(pg_relation_size(i.indexrelid)) AS dimensione
FROM pg_index i
WHERE i.indrelid='public.molecule_embeddings'::regclass
ORDER BY i.indexrelid::regclass::text;

SELECT count(*) AS tabelle_applicative
FROM pg_tables WHERE schemaname='public' AND tablename<>'molecule_embeddings';

SELECT extname,extversion FROM pg_extension WHERE extname IN ('vector','pg_trgm');
