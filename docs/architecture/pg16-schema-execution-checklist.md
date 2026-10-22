# Mercurion PostgreSQL 16 — applicazione SQL per Notebook e Synthesis

Stato: bozza operativa, da eseguire dall'operatore su PostgreSQL; l'assistente non ha connessione al database.

## File locali consegnati in chat

- 00_preflight_readonly.sql: uno e un solo resultset in pgAdmin (CHECK_NAME, STATUS, AFFECTED_ROWS, DETAILS). Niente COMMIT finale.
- 01_molecular_identity_guard.sql: CHECK + indice UNIQUE parziale custom + trigger di immutabilità; APPLICARE soltanto dopo refactor del backend.
- 02_reset_notebook_synthesis_pg16_v2_DRAFT.sql: bozza transazionale con **8 DROP di sole tabelle legacy** Notebook/Synthesis, blocco fail-closed se trova nuove tabelle e FK CASCADE selettive sui riferimenti live alle molecole. Il solo SELECT preflight e' eseguibile ora; NON applicare il reset finche' Nest/GraphQL non e' allineato.
- 00c_cross_owner_repair_feasibility.sql: report read-only sulla possibilita' di riparare 307 join corrotti senza cancellare molecole/collezioni.

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

## Evidenze aggiuntive

La seconda analisi ha rivelato 307 link cross-owner esclusivamente ChEMBL (184 con owner della collection e 123 con owner della molecola); il commit storico del 01/12/2025 ff1c5d8 indica una correzione dei filtri owner assenti. Non procedere con cleanup automatico; valutare prima i remap a copie ChEMBL gia' possedute dal proprietario. Rimuovere l'autopurge del join in un cutover coordinato. La scelta CASCADE riguarda DELETE dell'item esplicito, non DROP TABLE CASCADE.
