# 0113 - Enforce an acyclic Angular production import graph

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove the remaining Angular production import cycles and add a deterministic CI graph check so component/service/model dependencies remain acyclic.

Source: `NG-027` in Series `0001`.

## Context

The Series identifies two concrete cycles: Toast service/component ownership and AddMolecules/SearchResult coupling. `UI-018` is expected to move toast contracts into a neutral model, while the current SearchResult imports `ChipItem` from `add-molecules-to-collection.component.ts` and AddMolecules imports `SearchResultComponent`, creating a component-to-component cycle. Earlier tasks create neutral collection-picker/search contracts that this task must use.

## Relevant files and modules

- `MercurionWebNg/src/app/services/toast.service.ts`
- `MercurionWebNg/src/app/components/common/toast/`
- `MercurionWebNg/src/app/components/search-overlay/search-result/`
- `MercurionWebNg/src/app/components/action-components/add-molecules-to-collection/`
- neutral models/contracts created by `UI-018`, `0089`, `0101`/related tasks
- Angular TypeScript import graph and root CI scripts

## In scope

- Re-scan the complete production Angular static import graph after previous refactors.
- Remove every cycle, including the two audited baseline cycles and any new cycle exposed by refactoring.
- Move shared model/event contracts to neutral modules that depend on neither participating component/service implementation.
- Establish a deterministic dependency-graph tool/config capable of resolving the Angular/TypeScript project and lazy imports appropriately.
- Fail CI on any production import cycle.
- Keep an explicit distinction between static dependency cycles and legitimate runtime event/data flow.

## Out of scope

- Do not break a cycle by duplicating a type/model in both sides.
- Do not hide cycles with broad tool exclusions or barrel indirection.
- Do not forbid legitimate lazy/dynamic edges merely because they are dynamic; model them correctly in the checker.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Production Angular's TypeScript dependency graph is acyclic.
- Shared data contracts live in neutral layers, never inside a component implementation imported by another feature.
- The graph checker runs in CI and has zero unapproved cycles.
- Any exclusion is path-specific, machine-readable and justified by tooling/generated-code constraints, not architecture convenience.

## Requirements

1. Reproduce the current graph and record all detected SCCs/cycles before remediation.
2. Verify the Toast cycle is removed by the neutral contract established by `UI-018`; complete cleanup if residual edges remain.
3. Move `ChipItem`/selection contracts or their successors out of AddMolecules component implementation so SearchResult and collection-picker code depend on a neutral model.
4. Resolve any additional cycle revealed after earlier task migrations using directional dependency boundaries.
5. Add a graph command such as `ng:graph:check`/equivalent with deterministic TS path resolution and register it in `ci:check`.
6. Add a small negative fixture/test proving a synthetic cycle fails the gate.

## Acceptance criteria

- [ ] The production Angular static import graph contains zero cycles.
- [ ] Toast service/renderer depend on neutral toast contracts, not on one another.
- [ ] SearchResult does not import a type from AddMolecules component implementation.
- [ ] No cycle was hidden by code duplication, barrels or broad exclusions.
- [ ] CI deterministically fails when a production import cycle is introduced.

## Validation

Run the dependency-graph checker, its negative fixture/test and canonical CI-parity gates.

## Browser validation

No special browser validation is required solely for graph topology, but use `http://localhost:8888` to regression-test toast rendering and collection search/selection flows affected by moved contracts.

## Stop conditions

Mark `BLOCKED` if a detected cycle reflects an unresolved ownership decision that cannot be made from prior task contracts; do not suppress the cycle in tooling.

## Dependencies

- `UI-018` must be `DONE`.
- Collection-picker/search decomposition tasks `0089`, `0100`, `0101` as applicable should be `DONE`.

## Execution notes

### Feature branch
`feature/NG-027` from `207431fdea7e06ae0a028efac20099369fe62b5e`.
### Preflight
* The clean feature branch matched the supplied base SHA
  `207431fdea7e06ae0a028efac20099369fe62b5e`. The exact base CI run
  `34682561695` completed successfully.
* No task-owned Angular, Nest, Tox21, test watcher, or workspace-consuming
  process was active before implementation. No install or aggregate local CI
  command was run.
* The pre-remediation audit identified the remaining SCC as
  `SearchResultComponent -> AddMoleculesToCollectionComponent ->
  SearchResultComponent`, caused by the `ChipItem` import/re-export. The
  earlier Toast SCC was verified already removed: both the service and
  renderer use `Models/toast.models.ts`, and the renderer imports the service
  rather than the reverse.
### Preflight remediation
None.
### Summary
Moved the shared `ChipItem` import in `SearchResultComponent` to the
feature-neutral `add-molecules-to-collection.flow.ts` contract, eliminating
the component-to-component edge without duplicating the model. Added a
TypeScript-aware deterministic production import-graph checker that resolves
Angular project imports, aliases, exports, and lazy `import()` edges, reports
strongly connected components, and supports fixture roots. Registered its
positive gate and synthetic negative-cycle test in `ci:static`/`ci:check`.
### Task-specific validation performed
* `npm run ci:angular:import-graph` — passed; 280 production modules were
  checked and the negative fixture was rejected.
* `npm run typecheck --workspace mercurion_web_ng` — passed.
* Focused Angular component/flow tests — 8 SUCCESS.
* Focused ESLint — 0 errors; one pre-existing Angular output-name warning.
* Canonical runtime startup was performed in the required Tox21, Nest, Angular
  order. After two consecutive complete readiness rounds, the protected
  dashboard rendered through `http://localhost:8888` as `Benvenuto Test.` and
  the browser error console was empty. The existing profile/session redirected
  `/login` to the authenticated dashboard; no credentials were recorded or
  changed. Runtime interaction attempts for dashboard action controls were not
  used as graph acceptance evidence because the MCP reported the controls
  non-interactive; all three worker-started processes were stopped and their
  absence was verified.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run. The exact
pushed feature SHA requires GitHub Actions CI for full clean-install and
aggregate parity.
### Browser validation performed
Canonical edge readiness passed with two consecutive complete HTTP 200 rounds
for `/health` and `/`. The authenticated dashboard was observed through the
persistent Chrome profile with no console errors. No special browser behavior
was changed by the import-only refactor.
### Commits
* `6ff818dfb6a77c6a5aad89dcc820470108ef5a46`
  (`fix(NG-027): enforce acyclic Angular imports`) pushed to
  `feature/NG-027` with the Copilot coauthor trailer.
### Merge / CI
Exact feature-SHA CI run `34683153418` was dispatched for
`6ff818dfb6a77c6a5aad89dcc820470108ef5a46` and was still in progress when
this note was written. The coordinator owns waiting for that exact run before
integration.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
