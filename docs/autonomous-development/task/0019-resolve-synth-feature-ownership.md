# 0019 - Resolve Synth feature ownership

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Record the human-approved decision to retain Synth for Mercurion `1.0.0-beta` and make its Nest/GraphQL domain contract suitable for the separately planned Angular Synthetic Route Builder. This task does not implement that frontend.

Source: `SYS-019` in Series `0001`.

### Future tasks which will depend on this one (DO NOT IMPLEMENT NOW)

1. **Introdurre TypeORM migrations e ciclo di vita controllato dello schema**

#### Analisi funzionale
Rendere l'evoluzione dello schema PostgreSQL deterministica, versionata e riproducibile. Preview e production non devono dipendere da `synchronize=true`, interventi manuali o conoscenza implicita dello sviluppatore.

#### Analisi tecnica
Introdurre un DataSource TypeORM dedicato alle migrations, convenzioni e directory stabili, più script `migration:generate`, `migration:run`, `migration:revert` e `migration:show`. Imporre `synchronize=false` in preview/production e definire esplicitamente il comportamento dell'ambiente test. Creare una baseline compatibile con lo schema corrente e documentare backup/rollback. Verificare compatibilità con PostgreSQL/pgvector e fare in modo che ogni futura modifica alle entity sia accompagnata dalla migration appropriata.

#### Testing / validazione
- database vuoto → migrations → schema valido;
- applicazione avviabile con `synchronize=false`;
- applicazione di migration incrementali;
- rollback quando tecnicamente reversibile;
- integration test su PostgreSQL reale/containerizzato;
- human review prima del commit.

2 **Introdurre E2E browser testing dei critical user journey**

#### Analisi funzionale
Introdurre browser E2E dei principali journey utente per intercettare regressioni di integrazione, routing, rendering, auth e realtime non rilevabili dai soli test unit/component.

#### Analisi tecnica
Preferenza iniziale: Playwright. Configurare l'avvio dello stack test e automatizzare almeno welcome, login, MFA dove simulabile, dashboard, ricerca molecola, dettaglio molecola, creazione/apertura collection e logout/session handling. Usare semantic selectors e `data-testid` solo dove necessario. Abilitare trace e screenshot almeno in caso di failure, con configurazione stabile per esecuzione locale e CI.

#### Testing / validazione
- suite ripetibile e indipendente dall'ordine dei test;
- fixture/dati deterministici;
- critical journey eseguiti su browser reale headless;
- artifact diagnostici in caso di errore;
- predisposizione per estendere la suite a Synth, Notebook e Tox21;
- human review prima del commit.

3. **Rifondare integration/E2E testing del backend**

#### Analisi funzionale
Costruire una rete di sicurezza backend sufficiente a permettere refactor e nuove feature Code Red senza affidarsi ai soli unit test. L'attuale E2E è sostanzialmente uno smoke test di `AppModule`, quindi non protegge i flussi reali.

#### Analisi tecnica
Creare un test harness riproducibile con PostgreSQL e, quando necessari, Redis, NATS e Meilisearch; i provider esterni devono essere mockati o testati tramite adapter/contract. Definire fixture, data factory, cleanup e isolamento. Coprire inizialmente bootstrap, health, registrazione/login/sessione, endpoint autenticati REST/GraphQL, autorizzazioni negative, molecule collection, migration startup ed eventuale handshake realtime. L'infrastruttura deve essere riutilizzabile dai task successivi.

#### Testing / validazione
Il deliverable è la suite stessa: deve essere deterministica, ripetibile localmente e in CI, non dipendere da stato persistente precedente e produrre failure diagnostiche chiare. Verificare almeno un'esecuzione completa a database pulito e human review prima del commit.

4. **Implementare Synthetic Route Builder**

#### Analisi funzionale

Portare nel frontend la gestione delle vie sintetiche già modellata nel backend. L'utente deve poter creare, visualizzare, modificare, riordinare ed eliminare synthetic routes composte da step ordinati con substrati/prodotti, molecole collegate, condizioni, tipo di reazione e descrizione.

#### Analisi tecnica

Integrare i resolver GraphQL esistenti (mySyntheticRoutes, syntheticRoute, CRUD route/step/ref) con nuove route Angular dedicate. Realizzare lista, detail/editor route-aware, rendering strutturale delle molecole, step ordering e UI delle condizioni sulla freccia; il dettaglio step può vivere in drawer/overlay. Riutilizzare collection/custom molecules e componenti chemistry esistenti, evitando duplicazione di domain logic. UI mobile-first e coerente con light/dark mode.

#### Testing / validazione

- unit test di state/transformation logic;

- GraphQL integration test;

- E2E create → edit → reorder → reload → delete;

- test ownership/autorizzazione;

- verifica responsive e accessibilità basilare;

- human review prima del commit.

## Context

The Nest application contains a substantial `synth` module with entities, services, resolvers and DTOs, while the audit found no Angular consumer. The original autonomous run correctly stopped because product ownership could not be inferred. A later direct human decision retained the module for Mercurion `1.0.0-beta` and clarified that Angular consumption belongs to the future Synthetic Route Builder task already listed above.

The retained backend must represent a molecule pool assembled from selected collections, ordered multistep reactions, reusable custom molecules, and structured reaction-arrow content. ChEMBL entries cannot be edited directly: a custom molecule copy must be created before the molecule enters a synthesis pool.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/synth/`
- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNode/src/app.module.ts` and module-registration/configuration paths
- Angular route/service/page/component tree, especially GraphQL consumers
- product/repository documentation that may establish Synth ownership

## In scope

- Document the explicit `retain` decision and backend ownership for `1.0.0-beta`.
- Replace the ambiguous direct molecule-reference model with a materialized synthesis pool containing custom molecules only.
- Preserve the selected source collections independently from the materialized pool so later UI work can show provenance without coupling step history to mutable collection contents.
- Represent each step as an ordered set of typed items with explicit placement before, on, or after the arrow.
- Cover reactants/building blocks, reagents/reactives, solvents, conditions, catalysts, products, byproducts and free-form annotations.
- Allow the same pool molecule to be a product in one step and a reactant in a later step.
- Keep the Nest schema and generated Angular schema types aligned and add focused contract/domain tests.

## Out of scope

- Angular routes, pages, components, GraphQL documents/services and navigation entry points.
- Browser/E2E implementation or validation of the future Synthetic Route Builder.
- Automatic ChEMBL-to-custom structure duplication: the existing ChEMBL collection entity does not persist the structure needed to create the editable custom copy. The pool contract rejects non-custom items and expects that explicit copy workflow to run first.
- TypeORM migrations and production schema lifecycle, which are assigned to the future migration task above.
- General Synth CRUD outcome, projection-planner and transactional-patch debt assigned to tasks `0145`, `0168` and `0169`, except for the narrow ownership and integrity checks required by the new pool/item contract.

## Decisions already made

- Synth is explicitly retained for Mercurion `1.0.0-beta` by direct human decision.
- The Angular consumer remains planned work and is intentionally not part of `SYS-019`.
- Mobile support for the visual route builder is undecided because of the available drawing area; the backend contract is device-independent.
- A synthesis pool stores selected collection provenance and stable custom-molecule membership. Updating a source collection does not silently rewrite an existing synthesis.
- A pool molecule already referenced by a step cannot be removed until those references are removed.

## Requirements

1. Keep `SynthModule` registered and document the explicit retain decision.
2. Persist selected source collections and a materialized, custom-only molecule pool per synthesis.
3. Require every molecular step item to reference a pool membership belonging to the same user and synthesis.
4. Model ordered step items by chemical kind and arrow position; allow textual arrow content when no molecule applies.
5. Keep GraphQL schema and generated Angular schema types aligned without adding an Angular consumer.
6. Add focused tests for pool ownership/integrity, multistep molecule reuse, textual conditions and schema shape.

## Acceptance criteria

- [x] The explicit decision to retain Synth for Mercurion `1.0.0-beta` is documented.
- [x] Synthesis exposes selected source collections and a stable custom-only molecule pool.
- [x] Ordered step items distinguish all approved chemical/text kinds and their arrow position.
- [x] A product can be reused as a reactant by referencing the same pool membership in a later step.
- [x] Cross-user/cross-synthesis molecule references and removal of in-use pool molecules are rejected.
- [x] The legacy `OneToOne` main-substrate/product and unstructured `conditions` model is absent.
- [x] GraphQL schema/codegen/validation checks pass and focused contract tests cover the retained backend.
- [x] Angular/Nest builds and affected tests pass without implementing the Angular feature.

## Validation

Run focused Synth domain/schema tests, GraphQL schema drift/codegen/validation and the complete canonical CI-parity gate.

## Browser validation

Not required. This task explicitly establishes the retained backend contract; the Angular consumer and its browser validation belong to the future Synthetic Route Builder task.

## Stop conditions

Mark `BLOCKED` if the retained pool/step contract cannot be implemented without an additional product decision, or if required local/feature CI evidence cannot be established. Missing Angular UX details are not a blocker for this backend-only task.

## Dependencies

- `0007-centralize-static-graphql-document-catalog.md` should be available if Synth is retained.
- `0008-enforce-nest-graphql-schema-drift-check.md` should be available for either branch.

## Implementation notes

This task was originally a decision gate. The direct human retain decision re-enabled it with the narrowed backend-only scope recorded above.

## Execution notes

### Summary

Re-enabled by direct human instruction after the earlier `BLOCKED` outcome. Synth is retained for Mercurion `1.0.0-beta`; this execution replaces the insufficient molecule-reference model with a backend contract for a custom-only molecule pool and ordered multistep reaction items. Angular implementation remains assigned to the explicitly listed future Synthetic Route Builder task.

### Validation performed

- Unchanged `develop` baseline and reconciled feature-branch preflight: `npm ci` and `npm run ci:check` (exit 0).
- Focused Synth service and schema contract tests: `14/14` passed.
- Final clean install: `npm ci` (exit 0, 0 vulnerabilities).
- Full final CI-parity gate: `npm run ci:check` (exit 0), including Angular `287/287`, Nest `124/124` suites and `204/204` tests, Nest E2E `1/1`, both builds, GraphQL drift/codegen/validation and all static/contract gates.

### Browser validation performed

Not required for this backend-only task.

### Changed files

- `MercurionWebNode/src/app_modules/synth/Models/`
- `MercurionWebNode/src/app_modules/synth/resolvers/`
- `MercurionWebNode/src/app_modules/synth/services/`
- `MercurionWebNode/src/app_modules/synth/synth.module.ts`
- `MercurionWebNode/src/app_modules/synth/synth-schema.contract.spec.ts`
- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNg/src/app/generated/schema.ts`
- `packages/rest-contracts/src/application-errors.ts`
- `docs/autonomous-development/task/0019-resolve-synth-feature-ownership.md`

### Blocker / human decision required

None. The direct human decision is `retain`; Angular entry-point and mobile UX decisions are deferred to the future frontend task.
