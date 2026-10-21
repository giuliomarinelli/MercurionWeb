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
- Il trigger purge_orphan_items e' attivo e cancella una molecola quando perde l'ultima appartenenza a collezioni: incompatibile con la scelta di cancellazione esplicita e CASCADE controllato.

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

## Audit associazioni Molecule Collection — 21/10/2026

I CSV ottenuti dal PostgreSQL reale contengono 1.511 join: 1.204 coerenti e **307 cross-owner**. Tutte le anomalie sono ChEMBL, con system_key null sia per item sia per collection:
- 184 join con owner = proprietario collection != proprietario item: 39 item, 7 collections, un join owner.
- 123 join con owner = proprietario item != proprietario collection: 6 item, 55 collections, tre join owners.
- Nessuna anomalia custom. I timestamp desumibili dagli ID UUIDv7 collocano la generazione fra 27/10 e 30/11/2025.

GitHub commit ff1c5d8b055dcb01c1d96ca97666d113595507e8 (01/12/2025) ha corretto controlli owner assenti in addMoleculeToCollectionWithManager, candidate selection addMany/bindMany e filtri selectAll sovrascritti da .where. E' una spiegazione fortemente supportata dei dati, non una prova forense definitiva senza log di produzione.

L'attuale codice che duplica una collezione copia gli item_id dai join sorgenti senza riconsultare l'ownership degli item; deve essere protetto per non propagare dati corrotti.

### Rimedi consentiti e limiti

- Nessuna ownership condivisa e' prevista: questi 307 link sono illegittimi.
- Per i 184 join proprietario-collection: preferire remap a ChEMBL item del medesimo proprietario e medesimo molregno, oppure creare item locale con UUIDv7 lato app, **senza** copiare note/private metadata altrui; decidere eventuali duplicati del join.
- Per i 123 join proprietario-item: la collection e' estranea, quindi non e' possibile inferire una nuova collection destinazione; proposta rimozione dei link errati dopo backup/review.
- La precedente autorizzazione DROP si limita a Notebook/Synthesis: **nessuna riparazione distruttiva delle 307 join e' stata approvata o eseguita**.
- Prima di qualsiasi DELETE di join correggere l'autopurge: il trigger oggi potrebbe cancellare la molecola sottostante, anche se l'utente non ha richiesto tale operazione.
- Eseguire analisi read-only di quanti record sono gia' remappabili e quanti richiedono creazione custom per proprietario ChEMBL (script 00c), poi preparare una riparazione transazionale verificabile.

### Decisione ON DELETE CASCADE

Il proprietario preferisce CASCADE per la **cancellazione definitiva ed esplicita** di una molecola con anteprima impatto e conferma UX. Non usare CASCADE su DROP TABLE. Nel DDL target:
- molecule_collection_items -> synthesis_pool_molecules: ON DELETE CASCADE;
- synthesis_pool_molecules -> synth_step_items: ON DELETE CASCADE;
- molecule_collection_items -> experiment_execution_molecule_links: ON DELETE CASCADE (collegamenti live).
- Lo storico immutabile ExperimentProtocolRevision deve sopravvivere tramite snapshot con struttura/condizioni autonome, indipendente dalle FK verso entita' live.
- Rimuovi da collezione = DELETE join, **senza DELETE implicito della molecola**. Eliminazione molecola = mutation distinta, owner-scoped, anteprima dipendenze, conferma, recheck in transazione.
- Il trigger legacy purge_orphan_items e il raw SQL di MoleculeCollectionService che elimina molecole orfane devono essere dismessi/coordinati col nuovo backend, altrimenti una semplice disassociazione potrebbe innescare un CASCADE non confermato.
- Solo FK singole, senza user_id: verifiche owner restano responsabilita' dell'applicazione.
