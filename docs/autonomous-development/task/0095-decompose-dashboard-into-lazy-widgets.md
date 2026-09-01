# 0095 - Decompose dashboard into lazy widget view models

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Turn the dashboard into a layout/composition route where each widget owns a query/view-model adapter and a presentational lazy component; the dashboard shell must not transform chart/domain datasets itself.

Source: `NG-009` in Series `0001`.

## Context

`MercurionWebNg/src/app/pages/profile/dashboard.page.component.ts` currently injects application services and combines loading, data transformation and rendering responsibilities. Later task `NG-025` owns the broader initial-bundle budget and lazy-loading of heavy libraries such as chart/dashboard code; this task should establish widget-level lazy boundaries and view-model ownership that make that optimization straightforward.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/profile/dashboard.page.component.ts`
- `MercurionWebNg/src/app/pages/profile/dashboard.page.component.spec.ts`
- dashboard/chart components and services imported by the page
- account/profile/domain services used to populate widgets
- canonical page-state/progress primitives

## In scope

- Inventory the dashboard's current widgets/sections and give each a feature-local query/view-model adapter.
- Extract presentational widget components with typed inputs or facade state.
- Lazy-load widget implementations where Angular supports it without breaking UX.
- Keep the dashboard page responsible only for page layout, widget composition and cross-widget shell concerns.
- Move chart-series/data-shape transformation out of the page into testable mappers/adapters.
- Add independent loading/error/empty/content state per widget as appropriate.

## Out of scope

- Do not change dashboard business metrics or formulas.
- Do not globally optimize every heavy dependency/bundle; `NG-025` owns final budget enforcement.
- Do not duplicate account/profile data sources already normalized by prior tasks.

## Decisions already made

- Widgets are independently renderable feature units.
- Dataset transformation belongs to mapper/view-model adapters, not the page template/component.
- A slow/failing widget must not necessarily prevent unrelated widgets from rendering unless the existing product semantics require a shared gate.

## Requirements

1. Define a typed view model per widget.
2. Keep network/query ownership in widget facades/adapters rather than presentation components.
3. Ensure repeated dashboard navigation does not accumulate watchers/listeners.
4. Make lazy widget loading observable/testable and compatible with OnPush/signal state.
5. Preserve dashboard accessibility and responsive layout.
6. Add unit tests for widget mappers and state transitions.

## Acceptance criteria

- [ ] Dashboard shell contains no chart/domain dataset transformation.
- [ ] Each widget has an independently testable query/view-model boundary.
- [ ] Widget presentation is lazy where practical.
- [ ] Widget loading/error/empty/content states are deterministic.
- [ ] Existing metric values and interactions remain compatible.

## Validation

Run focused dashboard/widget tests plus canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open Dashboard at representative viewport sizes, verify independent widget loading/rendering, inspect network requests for unnecessary duplication, exercise any interactive chart/widget controls and confirm no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a current metric transformation is ambiguous or cannot be preserved without a product/analytics decision.

## Dependencies

- Canonical page-state/design-system and account/session facade tasks must be available.

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
