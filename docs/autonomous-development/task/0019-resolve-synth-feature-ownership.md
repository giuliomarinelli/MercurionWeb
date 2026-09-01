# 0019 - Resolve Synth feature ownership

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Resolve the currently server-only Synth domain into one explicit product state: either a supported Mercurion feature with an Angular consumer and contract coverage, or code that is fully removed from runtime/schema so no zombie feature remains.

Source: `SYS-019` in Series `0001`.

### Future tasks which will depend on this one (DO NOT IMPLLEMENT NOW)

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

The Nest application contains a substantial `synth` module with entities, services, resolvers, DTOs and tests, while the audit found no Angular consumer. This task intentionally cannot infer product intent from code volume alone.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/synth/`
- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNode/src/app.module.ts` and module-registration/configuration paths
- Angular route/service/page/component tree, especially GraphQL consumers
- product/repository documentation that may establish Synth ownership

## In scope

After an explicit product decision is established:

**If Synth is retained:**
- make the feature reachable/usable from the intended Angular surface;
- add typed client documents/services using the canonical GraphQL tooling;
- add contract and appropriate feature tests;
- document ownership and supported scope.

**If Synth is removed:**
- remove its module registration, resolvers, services, entities/DTOs and schema exposure;
- remove associated configuration/tests/migrations/dead dependencies only when no longer used elsewhere;
- verify no runtime/schema references remain.

## Out of scope

- Autonomously deciding whether Synth belongs in the product.
- Redesigning the Synth feature beyond what a human-approved retain decision specifies.
- Partial disabling that leaves unreachable runtime/schema code as the steady state.

## Decisions already made

- Server-only zombie feature state is not acceptable.
- The final state is explicitly **retained and consumed** or **removed completely from runtime/schema**.
- Product ownership is a human decision, not an implementation-agent inference.

## Requirements

1. Search repository documentation and current code for an explicit decision on Synth product ownership.
2. If no decision is present, stop and request exactly one decision: `retain` or `remove`, plus any required retained-feature entry point/scope.
3. Once decided, execute only the corresponding branch above.
4. Keep the GraphQL schema and generated Angular contracts aligned with the resulting state.
5. Add tests proving retained behaviour or proving removed schema/module absence.

## Acceptance criteria

- [ ] An explicit product ownership decision for Synth is documented.
- [ ] If retained, Synth has a real Angular consumer and contract tests; it is not merely schema-visible.
- [ ] If removed, no Synth runtime module/resolver/schema surface remains.
- [ ] GraphQL schema/codegen/validation checks pass.
- [ ] Angular/Nest builds and affected tests pass.
- [ ] No zombie/ambiguous Synth implementation remains.

## Validation

Run GraphQL schema drift/codegen/validation plus full affected Nest/Angular builds/tests.

## Browser validation

If **retained**, use Chrome DevTools MCP through `http://localhost:8888` to exercise the human-approved Synth entry flow and verify its GraphQL requests/runtime UI.

If **removed**, browser validation is not required unless removal affects navigation or shared UI.

## Stop conditions

**Mandatory:** mark `BLOCKED` immediately if no explicit human/product decision says whether Synth is retained or removed. Do not choose based on implementation completeness, test coverage, naming, or perceived usefulness.

If retained but the required Angular UX/entry point is unspecified, block for that specific product decision before inventing one.

## Dependencies

- `0007-centralize-static-graphql-document-catalog.md` should be available if Synth is retained.
- `0008-enforce-nest-graphql-schema-drift-check.md` should be available for either branch.

## Implementation notes

This task is intentionally a decision gate. A high-quality autonomous outcome may be `BLOCKED` with a precise two-option decision request.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / branch-dependent._

### Changed files

_Not recorded._

### Blocker / human decision required

_None recorded yet._
