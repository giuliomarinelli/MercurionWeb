# Baseline e import degli embedding

Ordine esplicito, senza migration runner:

1. `10_table.sql`: preflight e tabella coerente con il dump, vector(768),
   preferred_name e journal dei chunk; non cancella dati.
2. Dati `molecule_embeddings_dump_chunks/molecule_embeddings-000.sql` … `049.sql`:
   input owner ignorati da Git, caricati dal tool con checksum e commit atomico.
3. `30_indexes.sql`: indice molregno e HNSW cosine **dopo** l'import completo.
4. `90_verify.sql`: sola lettura di conteggi, dimensioni e indici.

Seguire la [procedura completa Windows → VM](../../../../docs/infrastructure/local-vm/EMBEDDINGS-IMPORT.md).
Non eseguire i chunk manualmente alla cieca: il caricatore trasforma il COMMIT
per includere il marker del chunk nella stessa transazione e permette la ripresa.

Il dataset consegnato il 12 novembre 2026 contiene 2.644.421 righe a 768
dimensioni del modello `seyonec/ChemBERTa-zinc-base-v1`, circa 25,5 GB SQL.
Lo schema applicativo precedente ometteva preferred_name e le dimensioni;
questa baseline e l'entity correggono il contratto effettivamente usato dalle query.
