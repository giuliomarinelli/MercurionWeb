# 0096 - Introduce a collection-detail facade and independent toolbar/grid/pagination

- [ ] DONE
- [ ] BLOCKED

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
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
_Not started._

### Task-specific validation performed
_Not started._

### Full pre-merge CI-parity validation
_Not started._

### Browser validation performed
_Not started._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
