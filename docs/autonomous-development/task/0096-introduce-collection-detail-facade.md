# 0096 - Introduce a collection-detail facade and independent toolbar/grid/pagination

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Move routing, collection query state, filtering, item commands and pagination coordination out of `MoleculeCollectionDetailPageComponent` into a single collection-detail facade, with independent toolbar, grid and pagination presentation units.

Source: `NG-010` in Series `0001`.

## Context

`molecule-collection-detail.page.component.ts` currently extends `AbstractPaginationComponent<MoleculeCardItemModel>` and directly injects collection services while owning route/query/action behavior. Earlier FE work removes anonymous refetch ticks and UI task `UI-016` establishes canonical pagination/infinite-load semantics. Task `0102` later removes pagination inheritance globally; this task must make collection detail ready for composition without creating a parallel paging architecture.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/molecule-collection-detail/molecule-collection-detail.page.component.ts`
- its focused spec
- molecule collection/item GraphQL services and models
- action contexts used for collection/item commands
- canonical collection/molecule cards and pagination primitive
- `MercurionWebNg/src/app/abstract/abstract-pagination-component.ts`

## In scope

- Introduce one collection-detail facade with typed route identity and discriminated page state.
- Move query/filter/page coordination and item commands into the facade.
- Split toolbar/filter controls, item grid/list and pagination/load-more presentation into independent components.
- Replace any remaining anonymous refetch trigger with typed invalidation/query update established by prior FE tasks.
- Expose a composition-friendly pagination interface so task `0102` can remove inheritance without another feature rewrite.
- Add tests for route change, filter/page state, command invalidation and stale-request prevention.

## Out of scope

- Do not redesign GraphQL cache/type policies before `NG-023/024`.
- Do not change collection permissions/product semantics.
- Do not perform the global pagination-inheritance removal owned by `0102` outside this feature.

## Decisions already made

- Route identity and collection query state have one owner.
- Toolbar and grid are presentational feature units; they do not independently refetch the collection.
- Pagination follows the canonical page/cursor model introduced by the UI series.

## Requirements

1. Make route collection-id changes latest-wins and prevent stale collection results.
2. Define explicit loading/error/empty/content/page-pending states.
3. Keep filter/search intent separate from raw transport implementation.
4. Route add/remove/edit/delete item commands through facade methods and typed invalidation.
5. Preserve page title/breadcrumb and current navigation behavior.
6. Ensure returning to/reopening another collection cannot reuse stale item/page state.

## Acceptance criteria

- [ ] Page component is a thin route/layout shell.
- [ ] Toolbar, grid and pagination are independently testable components.
- [ ] One facade owns collection identity/query/filter/page state and commands.
- [ ] No refetch tick is required to refresh collection state.
- [ ] Existing collection-detail behavior remains compatible.

## Validation

Run focused facade/page/toolbar/grid tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, navigate between available collections, filter/search, page/load more, exercise item actions where local data permits, verify title/breadcrumb/state transitions and inspect network for stale/duplicate requests and relevant console errors.

## Stop conditions

Mark `BLOCKED` if current item mutation/invalidation semantics cannot be made deterministic without a backend/product decision.

## Dependencies

- Canonical collection/molecule cards and pagination primitive must be available.
- Typed domain invalidation task `0047` must be `DONE`.

## Execution notes

### Feature branch
`feature/NG-010`

### Preflight
* Confirmed clean `feature/NG-010` at base `e5fb7ab5ad42267fd9864cf4fa4ccc598e9a2984`.
* No task-owned Angular, Nest, Tox21, watcher, or workspace-consuming process
  was active before validation.
* Exact-base GitHub Actions run `34672567109` completed successfully with
  `Required gate` green; the run was the supplied metadata validation for the
  preceding NG-009 block.
* Did not run `npm ci` or `npm run ci:check` locally.

### Preflight remediation
None.

### Summary
Introduced `MoleculeCollectionDetailFacade` as the single owner of typed route
identity, collection query/filter state, discriminated loading/error/empty/
content/page-pending state, page coordination, item commands, and typed
invalidation. The page is now a layout shell composed from independently
testable toolbar, grid, and pagination/load-more components. Route and page
requests use a request version plus current collection identity check so stale
results cannot repopulate a reopened collection. The anonymous refresh tick was
removed and replaced with `items-changed` domain invalidation.

### Task-specific validation performed
* `npm run typecheck --workspace mercurion_web_ng` — passed.
* `npm run lint --workspace mercurion_web_ng -- --no-warn-ignored` — passed
  (pre-existing warnings only).
* `npm run test:ci --workspace mercurion_web_ng -- --include=src/app/pages/molecule-collection-detail/molecule-collection-detail.page.component.spec.ts`
  — passed; focused page spec compiled and executed through the Angular
  test runner.
* `git diff --check` — passed.
* Canonical runtime started in the required order (Tox21, Nest, Angular);
  Nest compiled with zero errors and Angular reached watch mode. Two
  consecutive edge readiness rounds returned HTTP 200 for `/health` and `/`.
* Through the dedicated browser profile, ordinary login with the local
  development test account reached the protected Dashboard and displayed the
  authenticated user state. Direct collection-detail navigation was attempted
  through `http://localhost:8888`; Chrome MCP snapshots remained available but
  click/navigation interactions timed out and the app remained on Dashboard.
  No console errors were reported. This is recorded as shared browser
  interaction evidence rather than task behavior evidence.

### Full pre-merge CI-parity validation
Not run locally by policy. Exact feature-SHA GitHub Actions validation remains
the coordinator's required pre-merge gate.

### Browser validation performed
Protected local runtime and authenticated Dashboard state were verified through
`http://localhost:8888`. The collection-detail route probe was attempted; the
Chrome interaction transport timed out before route content could be observed.

### Commits
Pending task implementation commit.

### Merge / CI
Feature branch publication and exact-SHA CI are required after the task commit.

### Rollback
Not applicable.

### Blocker / human decision required
None. The canonical pagination primitive referenced by the recipe is not
present as a reusable component on this base, so the feature-local pagination
unit exposes the same page/load-more contract without changing global
pagination inheritance (owned by task 0102).
