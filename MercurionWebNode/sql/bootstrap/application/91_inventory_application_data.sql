-- Inventario staging: sole letture, nessuna email o credenziale, nessun embedding.
SELECT current_database() AS database, current_user AS utente,
       inet_server_addr() AS indirizzo_server, inet_server_port() AS porta_server;

SELECT count(*) AS utenti FROM public.users;

SELECT count(*) AS riferimenti_molecole_iniziali,
       count(DISTINCT user_id) AS utenti_con_riferimenti_iniziali
FROM public.molecule_collection_items
WHERE system_key IN (
    'mercurion:starter-molecule:1280',
    'mercurion:starter-molecule:11674',
    'mercurion:starter-molecule:5080',
    'mercurion:starter-molecule:173',
    'mercurion:starter-molecule:16591'
);

SELECT count(*) AS collezioni_iniziali
FROM public.molecule_collections
WHERE system_key = 'mercurion:starter-workspace';

SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;
