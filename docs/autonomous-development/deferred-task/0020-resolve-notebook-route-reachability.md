# 0020 - Resolve Notebook route reachability

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Resolve the Lab Notebook feature into a coherent product state: make the existing Angular/Nest Notebook feature reachable and end-to-end covered.

## Dettagli implementativi

### Analisi funzionale
Implementare nel frontend l'Electronic Lab Notebook già modellato dal backend, mantenendolo chemistry-oriented e non trasformandolo in un generico clone di Notion. L'utente deve poter creare notebook, chapter, section e page, riordinarli, modificarne il contenuto e collegare le pagine alle molecole usate nel lavoro sperimentale.

### Analisi tecnica
Integrare i resolver GraphQL esistenti per notebook/chapter/section/page, compresi move/reorder. Realizzare navigazione gerarchica, CRUD, editor rich text e gestione dirty/autosave/errori. Preferenza: Quill Delta come rappresentazione canonica, con `sanitizedText` derivato per indexing/search. Riutilizzare ngx-quill già presente e i link esistenti verso molecule collection items. UI mobile-first, responsive e coerente con light/dark.

### Testing / validazione
- unit test su state/reorder/autosave;
- GraphQL integration test;
- E2E create notebook → chapter → section → page → edit → reorder → reload;
- ownership/autorizzazione;
- persistenza corretta del contenuto e dei link;
- human review prima del commit.

Source: `SYS-020` in Series `0001`.

## Context

The repository contains Angular Notebook pages/components/services and Nest Lab Notebook resolvers/services, but `MercurionWebNg/src/app/app.routes.ts` has no Notebook route. The feature therefore exists in code yet is not reachable through the audited route tree.

## Relevant files and modules

- `MercurionWebNg/src/app/app.routes.ts`
- `MercurionWebNg/src/app/pages/notebook/`
- `MercurionWebNg/src/app/components/notebook/`
- `MercurionWebNg/src/app/services/graphql/notebook.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/`
- `MercurionWebNode/src/schema.graphql`
- navigation/menu components that would expose an approved Notebook route

## In scope

After an explicit product decision is established:

**After Notebook is implemented e2e:**
- add the approved reachable route/navigation entry point;
- ensure route guards/access rules match the intended audience;
- make the existing Notebook flow compile and function against the canonical GraphQL documents/types;
- add an end-to-end/browser-level route/feature check and relevant unit/integration coverage.

## Out of scope

- Autonomously deciding whether Notebook remains a product feature.
- Inventing route naming, information architecture or access policy if not already specified.
- Broad Notebook UX redesign.

## Decisions already made

- An unreachable but otherwise present feature is not an acceptable final state.
- The end state is fully reachable/supported or fully removed.
- Product route/feature ownership is human-controlled.

## Requirements

1. Confirm the intended Notebook route path, navigation exposure and access policy from existing documentation/human instruction before implementing them.
3. Implement the feature completely rather than leaving partial zombie code.
4. Keep GraphQL schema/client generated artifacts aligned.
5. Add tests proving the final state.

## Acceptance criteria

- [ ] Notebook has an explicit documented product status.
- [ ] A user can reach the feature through the approved Angular route and its primary flow is covered end-to-end.
- [ ] GraphQL checks, Angular/Nest builds and affected tests pass.
- [ ] No unreachable Notebook feature tree remains.

## Validation

Run GraphQL schema/codegen/validation checks plus affected Angular/Nest tests/builds.

## Browser validation

Start the canonical local runtime, navigate through `http://localhost:8888` to the approved Notebook route using Chrome DevTools MCP, verify the route is reachable under the correct guard, exercise a representative Notebook flow, inspect `/api/graphql`, and verify no uncaught console errors.

## Stop conditions

**Mandatory:** mark `BLOCKED` if there is no explicit human/product decision to retain/remove Notebook.

If retained, also block when route path, navigation placement or access policy is unspecified. Do not invent those product decisions.

## Dependencies

- `0005-align-notebook-delete-mutation-id-scalars.md`
- `0007-centralize-static-graphql-document-catalog.md` if retained.
- `0008-enforce-nest-graphql-schema-drift-check.md` for either branch.

## Implementation notes

The current absence from `app.routes.ts` is evidence of unreachability, not evidence that deletion is desired.

## Execution notes

### Summary

Blocked on 2026-09-04 during the mandatory product decision gate. The feature
cannot be retained, routed, exposed in navigation, or removed without an
explicit human/product decision.

### Validation performed

- Verified branch identity: `feature/SYS-020` at base SHA
  `1b07c761c29c58c6c466c631fec46665b4470ca3`.
- Verified effective repository signing config: `commit.gpgSign=false`.
- Proved no session/task-owned Angular, Nest, Tox21, test watcher, or
  workspace-consuming watch process was detected before clean install.
- Ran unchanged canonical preflight from the repository root:
  `npm ci` followed by `npm run ci:check`; both completed successfully.
- Searched repository documentation/configuration and relevant source for an
  explicit Notebook retain/remove decision, including `AGENTS.md`, `.github`,
  `docs`, `MercurionWebNg/src`, and `MercurionWebNode/src`. Findings only
  restate that Notebook must become reachable/supported or be removed; they do
  not choose retain vs. remove and do not approve a route path, navigation
  placement, or access policy.

### Browser validation performed

Not performed. Browser validation is not needed for this blocked decision gate,
and no Notebook route should be invented before the product decision exists.

### Changed files

- `docs/autonomous-development/deferred-task/0020-resolve-notebook-route-reachability.md`

### Blocker / human decision required

Required explicit human/product decision:

1. Retain Notebook as a supported product feature, or remove it completely from
   client, schema, and server.
2. If retained, explicitly approve the canonical Angular route path, navigation
   exposure/placement, and access policy/guard audience before implementation.

## Deferred program handoff (management decision 2026-09-14)

Management removed the Notebook program from the current autonomous workflow.
This file and recipes `0164`–`0167` are non-executable backups for a separately
configured future development program. Their numeric identities remain reserved
and must not be reused.

The following work was transferred here before being removed from active mixed
recipes:

### From 0114 / NG-028

- Include the Notebook Angular tree in the future production reachability graph
  only after it has an approved real route/registry entrypoint.
- Classify every Notebook page, component and service as reachable retained
  product code or remove it as part of the future Notebook decision; never add a
  synthetic eager import merely to satisfy an orphan checker.
- Make the future orphan/reachability gate understand the approved lazy Notebook
  entrypoint and add negative coverage for newly orphaned Notebook production
  files.
- Browser-smoke the approved Notebook route through `http://localhost:8888` and
  reject lazy-chunk failures, missing UI and incorrect guard behavior.

### From 0195 / QA-009

- Add a deterministic Playwright Notebook journey through
  `http://localhost:8888`: create Notebook, chapter, section and page; edit,
  reorder and reload; then verify persistence and representative
  loading/error/empty states.
- Use accessible locators, isolated authentication/storage, controlled
  API/GraphQL fixtures where appropriate, web-first assertions and failure
  traces/screenshots without arbitrary sleeps.
- Keep the mocked browser journey distinct from the future real
  frontend/backend same-version system proof.

### Dedicated implementation recipes

- `0164`: ordered-tree domain and thin Notebook level adapters.
- `0165`: parameter-safe Notebook reorder SQL.
- `0166`: atomic ownership, membership, move and reorder validation.
- `0167`: migration-backed concurrent sibling-order invariants.

### From 0151 / DATA-002

- Add the Notebook entity constraints and indexes required by its approved
  ordered-tree model, including the final parent/order invariant.
- Validate the Notebook constraint set against the future migration baseline
  without relying on application pre-checks.

### From 0152 / DATA-003

- Migrate Notebook services to the canonical TypeORM Unit of Work and ensure
  nested helpers use transaction-scoped managers and repositories.

### From 0185 / BE-032

- Add explicit Notebook command patch allowlists and reject protected-field
  injection.
- Browser-check representative Notebook metadata updates through the canonical
  development edge.

### From 0193 / QA-007

- Inventory and contract-test every public LabNotebook, Chapter, Section and
  Page resolver through the real Nest GraphQL application, including schema,
  authentication, ownership, success, invalid-input and not-found behavior.

### From 0194 / QA-008

- Add real-PostgreSQL transaction and concurrency tests for Notebook sibling
  ordering, rollback, constraints and transaction-scoped repository use.

The next Notebook program must explicitly copy or move these deferred recipes
back into an executable task directory and establish its own ordering,
dependencies, route/access decisions and CI lifecycle. They are not part of the
current Series execution set merely because their registry rows remain as
reserved historical identities.
