# PostgreSQL 16 — riconciliazione DB-first Notebook e Synthesis

Stato: decisioni utente confermate il 21 ottobre 2026. Documento di pianificazione; NON conferma che il DDL sia stato applicato.

## Autorità dello schema

- PostgreSQL 16 è la fonte della verità; TypeORM entity/DTO/service devono aderirvi.
- In questo programma NON utilizzare TypeORM migrations né TypeORM synchronize per modificare lo schema.
- La generazione degli UUID (UUIDv7) resta lato applicazione.
- Le FK su identificatori singoli (senza user_id) sono INTENZIONALI: minor accoppiamento sullo schema. L'ownership del proprietario e la coerenza delle relazioni cross-owner/cross-synthesis vanno verificate dai servizi con query owner-scoped e test negativi, non inferite dalle sole FK.

## Ambito delle operazioni distruttive autorizzate

Notebook e Synthesis sono stati prototipi senza un workflow e2e utilizzato. Il proprietario autorizza esplicitamente a perdere eventuali dati legacy di QUESTI due domini, inclusi gli oggetti lab_notebook_chapters, lab_notebook_sections, lab_notebook_pages, lab_notebook_links e synth_step_molecule_refs, anche tramite DROP e CREATE ex novo.

Questa autorizzazione NON si estende a molecule_collection_items, molecule_collection_items_join, molecule_collections, users, documents, o altri domini. Vietato usare CASCADE indiscriminato: un DROP RESTRICT che fallisce su dipendenze esterne deve bloccare la procedura e far esaminare il vincolo.

## Differenze concrete osservate nei DDL forniti

- DB legacy synth_steps contiene main_substrate_id, main_product_id e conditions, e synth_step_molecule_refs; il backend più recente si aspetta synth_step_items, synthesis_pool_molecules e synthesis_pool_collections.
- La FK legacy "synth_steps_main_substrate_molecule_collection_items_fk" punta per errore a main_product_id.
- La FK legacy synth_step_molecule_refs.step_id usa ON DELETE SET NULL nonostante la colonna NOT NULL.
- DB legacy Notebook: capitoli/sezioni/pagine riflettono terminologia abbandonata; gerarchia canonica: LabNotebook -> NotebookSection -> NotebookExperiment -> ExperimentExecution.
- Su molecule_collection_items manca una UNIQUE parziale(owner,canonical_smiles) per custom; il solo controllo del servizio Nest non è atomicamente sufficiente.
- molecule_collection_items_join usa il trigger purge_orphan_items, potenzialmente in conflitto con nuove referenze persistenti alla stessa molecola.

## Sequenza di lavoro

0. Salvare backup ripristinabile e verificare un database di test. NON eseguire il rebuild su un DB usato dal backend attivo.
1. Eseguire il preflight pgAdmin corretto: un unico SELECT finale con risultato a righe per check, inclusa definizione di purge_orphan_items.
2. Progettare e revisionare lo schema target con FK semplici, ordered-tree, revisioni dei protocolli e pool molecolare.
3. Preparare DROP/CREATE TRANSAZIONALE **solo** sulle tabelle Notebook/Synthesis; NO CASCADE e precheck sui FK esterni.
4. Rifattorizzare Nest/GraphQL e i guardrail sulle mutazioni. Il trigger M1 va attivato solo in coordinamento con la disabilitazione dell'update dello SMILES canonico sui record custom.
5. Validare DDL e backend contemporaneamente in ambiente di test, poi eseguire il cutover e il frontend.
6. Verificare integrità, molteplicità, versioning immutabile, ownership (servizi), cancellazioni, reorder concorrente ed E2E.

## Segnaposto da investigare

- Definizione SQL effettiva di purge_orphan_items(); potrebbe cancellare molecole ancora associate ad altre risorse, oppure far fallire DELETE a causa di FK RESTRICT.
- Dati duplicati di molecole custom esistenti: vanno riconciliati, NON eliminati sulla base dell'autorizzazione riguardante Notebook/Synthesis.
- Risorse esterne con FK verso le tabelle legacy: il rebuild deve fermarsi fino a un piano mirato.
- Pool molecule e step items: prima attivazione deve rifiutare riferimenti cross-owner/cross-synthesis e molecole non custom tramite servizi e test.
- Coerenza tra ExperimentExecution.experiment_id e la revisione, e tra step e sintesi quando il link include step_id.
