# Mercurion PostgreSQL 16 — applicazione SQL per Notebook e Synthesis

Stato: bozza operativa, da eseguire dall'operatore su PostgreSQL; l'assistente non ha connessione al database.

## File locali consegnati in chat

- 00_preflight_readonly.sql: uno e un solo resultset in pgAdmin (CHECK_NAME, STATUS, AFFECTED_ROWS, DETAILS). Niente COMMIT finale.
- 01_molecular_identity_guard.sql: CHECK + indice UNIQUE parziale custom + trigger di immutabilità; APPLICARE soltanto dopo refactor del backend.
- 02_reset_notebook_synthesis_pg16.sql: proposta distruttiva transazionale, rimuove SOLO tabelle possedute da Notebook/Synthesis con DROP RESTRICT, poi crea modello target. Verificare DDL e contratti runtime prima dell'esecuzione.

## Preflight richiesto

- Backup e prova di restore.
- Resultset di tutti i check, inclusa la definizione della funzione purge_orphan_items.
- Conferma che nessuna tabella esterna dipenda tramite FK dalle tabelle da eliminare.
- Nessun processo Nest sta utilizzando lo schema precedente durante il reset.
- PostgreSQL 16 e proprietà dello schema controllate.
- Nessuna modifica ad altre tabelle; ogni statement verificato per assenza di CASCADE.
- Unicità molecole custom auditata indipendentemente dalla cancellazione dei dati legacy.

## Dopo il DDL

- Ispezionare pg_catalog per indici/FK/CHECK/trigger creati.
- Eseguire typecheck/lint e test di integrazione PostgreSQL reali dopo il refactor dei modelli TypeORM.
- Verificare schema GraphQL/codegen Angular con il modello aggiornato.
- Testare errori applicativi per 23505 e 23514; non esporre 500 per conflitti prevedibili.
- Verificare riutilizzo di CustomMolecule identiche in più synth senza duplicati, blocco update dell'identità, protocol revision freeze e salvataggio delle esecuzioni.
- Concludere con E2E Angular su desktop e mobile.
