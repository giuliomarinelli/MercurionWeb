# Mercurion scientific domain v1 — decisioni approvate

Stato: baseline funzionale approvata il 21 ottobre 2026. NON certifica che database o backend siano gia allineati.
Branch di riferimento: feature/6ad835e6321fb8a8c5e6ad45-6a93bf97280aac615b016fbc-notebook-and-synth-implementation.
Autorita dello schema: PostgreSQL 16 DB-FIRST; TypeORM aderisce al DDL verificato. NON introdurre TypeORM migrations per questo programma.
Ambito: account individuale con user_id; tutti i riferimenti persistenti devono rispettare la stessa ownership.

## Glossario e gerarchia canonica

- **LabNotebook / lab_notebooks**: quaderno di laboratorio, contesto scientifico generale (es. tesi).
- **NotebookSection / lab_notebook_sections**: sezione tematica, insieme di esperimenti. Sostituisce il significato legacy di NotebookChapter.
- **NotebookExperiment / lab_notebook_experiments**: esperimento progettato; obiettivi, ipotesi, protocollo e riferimenti a sintesi. Sostituisce il significato legacy di NotebookSection.
- **ExperimentExecution / lab_notebook_executions**: tentativo concreto, osservazioni, condizioni effettive e risultati. Sostituisce NotebookPage.
- **ExperimentProtocolRevision / lab_experiment_protocol_revisions**: versione immutabile della pianificazione usata da una o piu esecuzioni.
- **Synthesis / synthesis**: via sintetica autonoma, inizialmente lineare e multistep.
- **SynthesisStep / synth_steps**: trasformazione ordinata della via. Nome applicativo proposto in luogo di SynthStep; mantenere il nome SQL fino a una decisione DDL esplicita.
- **SynthesisStepItem / synth_step_items**: occorrenza di una molecola o annotazione nel passaggio, con ruolo e posizione della freccia.
- **SynthesisPoolMolecule / synthesis_pool_molecules**: appartenenza stabile di molecola custom a una sintesi, indipendente dalle collezioni.
- **SynthesisPoolCollection / synthesis_pool_collections**: provenienza dalle collezioni selezionate; modifiche successive alla collezione non riscrivono il pool.
- **CustomMolecule / molecule_collection_items con type=custom**: struttura unica nel perimetro del singolo user_id.

Gerarchia obbligata per i nodi figli: LabNotebook -> NotebookSection -> NotebookExperiment -> ExperimentExecution. I genitori possono essere privi di figli; il frontend puo predisporre i nodi minimi per semplificare la creazione rapida.

## Invarianti approvate

- **M1** La struttura canonica di una CustomMolecule gia creata non e mutabile: struttura diversa significa identita diversa.
- **M2** Un medesimo utente non crea due CustomMolecule con lo stesso canonical_smiles secondo la policy chimica v1; il backend usa get-or-create transazionale.
- **M3** La sostituzione di una molecola in una sintesi aggiorna solo le occorrenze esplicitamente selezionate, mai tutti i riferimenti globali in modo implicito.
- **S1** Synthesis e Notebook sono domini indipendenti, collegabili senza possesso esclusivo di molecole o sintesi da parte dei documenti.
- **P1** Ogni esecuzione avviata punta a una revisione immutabile del protocollo.
- **P2** La revisione conserva uno snapshot sufficiente a ricostruire la pianificazione originaria, anche se la via sintetica cambia.
- **N1** Quaderno -> Sezione -> Esperimento -> Esecuzione.

## Semantica e cardinalita

- Un esperimento ha 0..N esecuzioni e 0..N revisioni di protocollo; ciascuna esecuzione attiva/completata usa esattamente una revisione.
- Una via sintetica ha 0..N step ordinati; uno step ha 0..N items con ruolo specifico.
- Una molecola custom puo partecipare a molte sintesi e a molti step senza duplicazione della sua identita.
- Un esperimento puo collegare piu sintesi (N:M). Un'esecuzione puo collegare una o piu sintesi ed eventualmente specifici step (N:M contestualizzato).
- Le connessioni tra sintesi lineari sono un'estensione futura: condividere una molecola NON stabilisce automaticamente una dipendenza chimica.
- Collegamento o scollegamento di documenti non elimina automaticamente la sintesi o la molecola.

## Workflow essenziali

1. Da ChEMBL o Ketcher: canonicalizzazione server -> risoluzione owner-scoped -> riuso oppure creazione -> associazione al pool in un'unica operazione transazionale.
2. Da Ketcher in contesto sintesi: nessuna mutazione della struttura originaria; scegli una nuova molecola o quella gia presente e sostituisci solo le occorrenze richieste.
3. Crea esperimento: una bozza di protocollo e modificabile via Quill Delta. Non si crea una revisione per ogni autosave.
4. Avvia esecuzione: congela la revisione necessaria e associa l'esecuzione alla sua revisione nella stessa transazione.
5. Modifiche successive a sintesi, protocolli o metadati non alterano revisioni ed esecuzioni storiche.

## UX e scope della beta

- Desktop: builder di sintesi ordinato con rappresentazione grafica derivata dai dati; drag & drop eventuale miglioramento, non prerequisito.
- Mobile: editor strutturato, tap/chooser e rappresentazione di uno step alla volta; il diagramma deve essere consultabile senza drag & drop.
- Notebook: indice, reader, editor Quill Delta, dirty/autosave/error/retry, selezione delle molecole e dei riferimenti sintetici.
- Differiti: grafo multivia, sostituzione globale di molecole, LIMS specializzato, editing grafico arbitrario del grafo, versionamento completo di ogni Synthesis.

## Identificatori e cancellazione

ID assegnati lato applicazione (UUIDv7); il server PostgreSQL non genera UUID applicativi. user_id deriva dal contesto autenticato, mai da input client fidato.
Distinguere disassociazione da cancellazione. Prima di scegliere CASCADE/RESTRICT per documenti e molecole, verificare lo storico delle revisioni e il trigger legacy purge_orphan_items.
Le revisioni con esecuzioni storiche richiedono conservazione; per l'utente preferire archiviazione a cancellazione implicita.

## Piano di delivery

A: specifica e audit DB/TypeORM -> B: SQL PostgreSQL 16 con preflight + backup + migrazione di dati -> C: servizi backend e vincoli (resolver custom, revisioni, synthesis pool) -> D: editor Molecule, Notebook, Synthesis -> E: unit/integration/E2E + review.
I DDL sono di tipo expand/validate/cutover: NON eseguire renames, DROP o conversioni cieche mentre il codice legacy e attivo.

## Implementation checkpoint (2026-10-21, after local DB cutover)

**SQL validation**
- SQL 20/21 validated on an isolated PostgreSQL 16.15 fixture by the operator: 11/11 postflight OK, 54/54 rollback-only behavioral checks PASS; see `MercurionWebNode/sql/scientific-domain/VALIDATION-PG16.md`.
- The operator also ran **both SQL 20 and SQL 21 on the local application database**: screenshot shows 11/11 `OK`, with 13 new tables, 3 integrity triggers, expected live CASCADE FKs and no composite scientific FK. `lab_notebooks_old` remains.
- This is confirmation of database DDL, not evidence that the Nest app, GraphQL schema or Angular routes are operational yet.
- The 307 historical ChEMBL cross-owner links were repaired separately, confirmed by postflight: 0 remaining anomalies, 1,341 valid links.

**Nest implementation in branch**
- `LabNotebookModule` now registers v1 `LabNotebook`, `NotebookSection`, `NotebookExperiment`, `ExperimentExecution`, `ExperimentProtocolRevision`; old chapter/page resolvers were removed because the SDL generator discovers all `*.resolver.ts` files, even if their classes are absent from module providers.
- `NotebookDomainService` handles owner-scoped CRUD, archival, creation and atomic sibling reorders. It verifies ancestor ownership explicitly because the DB intentionally has single-column foreign keys.
- `ExperimentProtocolService` freezes snapshot revisions on execution start, reuses the current version only if SHA-256 matches, retries serialization conflicts and tracks execution states. It snapshots live synthesis steps, items, roles and molecule canonical SMILES. Provides owner-scoped experiment/synthesis and execution/synthesis/molecule links.
- Quill Delta v1 validation accepts full insert-only documents, never trusts supplied plain text or arbitrary HTML, and derives searchable text server-side.
- Scientific Notebook GraphQL queries/mutations and nested field resolvers are staged. New API is a breaking refactor of the unused legacy Notebook operations; regenerate `src/schema.graphql`.
- Unit tests were added for Quill validation and protocol freeze, plus rollback-only SQL smoke test `22_smoke_rollback_scientific_domain_pg16.sql`.

**Unverified/remaining**
- No local Node dependencies or project checkout are accessible to the assistant's execution environment; no Nest `npm run typecheck`, Jest or GraphQL SDL update/check has been executed after these commits. **Treat this branch as unverified code until these pass.**
- Run in `MercurionWebNode`: `npm run typecheck`, `npx jest --config ./jest.config.js --runInBand notebook-delta experiment-protocol molecule-collection`, then `npm run graphql:schema:update` and `npm run graphql:schema:check`. Review the regenerated `src/schema.graphql` and commit it with the backend.
- The new schema is already active on the operator's local PostgreSQL. Do not launch the old Nest Notebook runtime against it.
- SQL `30_custom_identity_guard_pg16_NOT_YET_APPLY.sql` is **not** deployed; generic molecule create/update and Ketcher still need copy-on-write/duplicate-reuse end-to-end before it may be applied.
- Notebook Angular reader/editor and linear synthesis route builder are pending; old page/chapter TypeScript service sources remain in Git history/source for later removal.
- Test GraphQL owner-negative paths, race conditions, body-size limits, status mutations, CASCADE impact and snapshots on a test database before declaring feature complete.

## Angular Notebook adapter checkpoint (2026-10-21)

The Angular source was migrated to the new Nest GraphQL contract **after** the operator verified the local PostgreSQL 16 schema and Nest TypeScript/Jest/build.

- Canonical catalog: `MercurionWebNg/src/app/graphql/documents/notebook.graphql` now uses NotebookSection, NotebookExperiment, ExperimentExecution, ExperimentProtocolRevision, and only currently supported v1 mutations.
- GraphQL scalar `JSONObject` maps to the existing `JsonObject` type in codegen.yml.
- `NotebookService` issues one-shot `network-only` Apollo reads, manages scientific-domain CRUD, archives, execution lifecycle actions, reorders, molecule/synthesis links. No old Chapter/Page client methods.
- `NotebookTreeComponent`, `NotebookTocComponent` and the landing/edit pages use the v1 hierarchy and `s_id`, `e_id`, `x_id` query params (NOT legacy c_id/p_id).
- Registered authenticated Angular routes: `/notebook`, `/notebook/:notebookId/read`, `/notebook/:notebookId/edit`.
- Editor uses `ngx-quill` with `format="object"`; only user-originated complete Quill Deltas are autosaved. An explicit Save Now/retry is available, and the editor route protects against navigation with unsaved changes.
- Execution UI provides Start/Complete/Cancel with explicit protocol revision indication. Historical revisions can be fetched as immutable snapshot resources.
- Angular unit specs were updated for the new GraphQL operations, route manifest and main components. These specs were **not executed** by the assistant.
- The committed schema.graphql is source-of-truth for client codegen. **The Angular generated files have not been regenerated in this repository by the assistant**: until `npm run graphql:generate` executes locally and generated artifacts are committed, the branch is expected to fail Angular typecheck due to stale operation exports.

### Windows verification

From repository root (PowerShell 7):

```powershell
git pull --ff-only
.\scripts\verify-scientific-frontend.ps1
```

This runs GraphQL catalog validation, regenerates generated schema/operations, checks codegen drift, typechecks, lints and builds Angular. `-RunTests` optionally enables focused Karma tests if a browser is available. Review and commit `MercurionWebNg/src/app/generated/schema.ts` and `MercurionWebNg/src/app/generated/graphql.ts` after passing.

### Remaining work

- Angular integration build and browser tests, responsive UX/accessibility audit, robust offline draft recovery and loading skeletons.
- Separate Synthesis linear route builder and molecule-selection/copy-on-write UX.
- Copy-on-write enforcement for generic Ketcher update paths and DB SQL 30 identity trigger; do not apply 30 prematurely.
- E2E scientific user journeys, version review and rich snapshot presentation.
