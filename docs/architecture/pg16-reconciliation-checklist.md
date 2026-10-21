# PostgreSQL 16 reconciliation — runbook

## Avvertenza operativa

La fonte di verita e il database PostgreSQL reale, non le decorazioni TypeORM. Questo runbook e basato sui DDL forniti il 21/10/2026. Non prova che tabelle e contenuti siano invariati al momento dell'esecuzione.

Il repository mantiene documenti storici sul workflow TypeORM migrations: per questa attivita prevale la decisione DB-first approvata dall'utente. Applicare SQL versionati e revisionati, NON TypeORM synchronize o migration:run.

## Differenze osservate

- PostgreSQL: synth_steps, synth_step_molecule_refs con main_substrate_id/main_product_id e conditions JSONB; mancano synth_step_items, synthesis_pool_molecules, synthesis_pool_collections.
- Entity Nest: sintetizzatore a pool custom e items tipizzati, con FKs alle nuove tabelle. Il backend corrente non e quindi pronto per i DDL legacy.
- PostgreSQL: nessuna UNIQUE(user_id,canonical_smiles) per type=custom; esiste UNIQUE(user_id,chembl_molregno).
- Vecchi LabNotebook chapters/sections/pages hanno significato diverso dai nomi del dominio approvato. Il rename richiede anche refactor dei contratti GraphQL/Angular.
- Join molecule_collection_items_join ha trigger AFTER DELETE trg_purge_orphan_items da ispezionare prima di attivare nuovi legami persistenti alle sintesi.
- Legacy synth_steps_main_substrate_molecule_collection_items_fk punta a main_product_id (anomalia reale nel DDL).
- Legacy synth_step_molecule_refs.step_id NOT NULL con FK ON DELETE SET NULL (incoerente).
- lab_notebook_links non espone user_id o vincolo di unicita per coppia; coinvolge risorse owner-scoped.

## Fasi di cutover

0. Backup verificato/ripristinabile e snapshot dello schema; misurare il numero di righe di ciascuna tabella e i riferimenti legacy.
1. Eseguire SQL preflight in sola lettura; arrestarsi su duplicati custom o ownership cross-user.
2. Aggiungere invarianti custom (UNIQUE parziale, struttura immutabile), rimuovendo prima gli update illegittimi dalle mutation del backend.
3. Creare in modo additivo il nuovo modello Synthesis e del Notebook, senza DROP o rename prematuri.
4. Migrare eventuali dati legacy di sintesi secondo mapping revisionato; i riferimenti ChEMBL non si possono convertire con sola SQL senza struttura canonica. Non cancellare la tabella legacy fino a che mapping e conteggi non tornino.
5. Deploy coordinato dei contratti Nest, GraphQL generati, Angular e scripts di rename/compatibilita. Rifiutare richieste se il livello schema non e compatibile.
6. Validare integrita con query, test PostgreSQL reali, e2e e backup. Eliminazione dei vecchi artefatti solo in una fase contract successiva e approvata.

## Prerequisiti non disponibili in chat

- Nessuna connessione diretta al PostgreSQL dell'utente: non e possibile attestare che gli script siano stati eseguiti.
- DDL della funzione purge_orphan_items() e conteggi delle righe non forniti.
- Non sono note le distribuzioni e la semantica storica dei ruoli nella tabella synth_step_molecule_refs.
- Non sono stati ispezionati snapshot di dati/Quill Delta reali, pertanto i contenuti testuali vanno preservati senza backfill automatico.
