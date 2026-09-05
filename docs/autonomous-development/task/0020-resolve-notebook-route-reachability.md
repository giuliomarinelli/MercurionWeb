# 0020 - Resolve Notebook route reachability

- [ ] DONE
- [x] BLOCKED
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

- `docs/autonomous-development/task/0020-resolve-notebook-route-reachability.md`

### Blocker / human decision required

Required explicit human/product decision:

1. Retain Notebook as a supported product feature, or remove it completely from
   client, schema, and server.
2. If retained, explicitly approve the canonical Angular route path, navigation
   exposure/placement, and access policy/guard audience before implementation.
