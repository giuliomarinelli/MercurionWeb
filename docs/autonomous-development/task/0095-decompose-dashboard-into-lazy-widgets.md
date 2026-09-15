# 0095 - Decompose dashboard into lazy widget view models

- [x] DONE
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

- [x] Dashboard shell contains no chart/domain dataset transformation.
- [x] Each widget has an independently testable query/view-model boundary.
- [x] Widget presentation is lazy where practical.
- [x] Widget loading/error/empty/content states are deterministic.
- [x] Existing metric values and interactions remain compatible.

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
`feature/NG-009`, based on `de82ea0ba1f991d80fcc6e57c86fe249ddb10548`.

### Preflight
Clean branch verified at the supplied base SHA. Exact base GitHub Actions `CI`
run `34671508893` completed successfully. The focused Angular baseline ran
`npm run test:ci --workspace mercurion_web_ng` and completed `447/447` tests
successfully. No task-owned application process was active before the probe.

### Preflight remediation
The canonical runtime was started in the required order (Tox21, NestJS,
Angular), with separate live handles. The edge returned retryable `502` while
the upstreams compiled, then two complete readiness rounds succeeded:
`/health` and `/dashboard` both returned `200`. The persistent browser profile
already exposed the protected Dashboard state; the dashboard menu control did
not become interactable for a fresh logout/login attempt, so validation used
the existing server-accepted protected session and recorded that limitation.

### Summary
Implemented the dashboard as a layout-only shell backed by a scoped
`DashboardFacade`. Added typed metrics, workspace-composition and activity
view models, pure mappers, independent state ownership, OnPush presentational
widgets, deterministic loading/error/content state, and a viewport-deferred
chart widget. Chart lifecycle cleanup is owned by the widget and facade
subscriptions are cancelled/replaced on refresh.

### Task-specific validation performed
* `npm run typecheck --workspace mercurion_web_ng` passed.
* `npm run lint --workspace mercurion_web_ng -- --no-warn-ignored` passed with
  the pre-existing warning set and zero errors.
* `npm run test:ci --workspace mercurion_web_ng` passed: `450/450`.
* `npm run build --workspace mercurion_web_ng` passed; the new
  `dashboard-charts-widget-component` appeared as a lazy chunk.
* `npm run chemistry:check-lazy --workspace mercurion_web_ng` passed.
* `git diff --check` passed.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are prohibited by the
autonomous-development policy; exact-SHA aggregate CI remains coordinator-owned.

### Browser validation performed
Through `http://localhost:8888/dashboard` at the representative persistent
profile viewport, the protected Dashboard rendered the independent metrics,
workspace composition and recent activity sections with existing values
`6/0/6/1`. Network inspection showed the expected account/history/profile
requests without duplicate dashboard data requests, and console inspection
returned no errors or warnings. The browser session remained authenticated
from the pre-existing local test account state; a fresh ordinary login could
not be performed because the account-menu control timed out in Chrome DevTools
MCP. All Tox21/Nest/Angular processes started by this task were stopped
afterward; only the externally managed Chrome DevTools MCP processes remained.

### Commits
Pending task commit on `feature/NG-009`.

### Merge / CI
Feature SHA and exact-SHA CI are coordinator-owned after this task commit is
pushed. No `develop` or `master` changes were made.

### Rollback
_Not applicable._

### Blocker / human decision required
Resolved during authorized recovery. The configured local test identity
completed a fresh ordinary login and reached a server-accepted protected
Dashboard state.

### NG-009 execution outcome (2026-09-12)

Implementation was completed on preserved branch `feature/NG-009` at
`19faee601e733705f54d450d9e129ded6590faa0`. Focused tests, typecheck, lint,
build, and lazy-chunk checks passed. Mandatory fresh authenticated browser
acceptance could not be completed: after logout, the configured local test
identity produced the rendered validation error `L'e-mail inserita non è
corretta`, so no protected post-login result could be proved. The feature
branch is preserved and frozen; no feature-SHA CI was started because the
required browser acceptance remained incomplete.

### Authorized recovery (2026-09-13)

Merged exact green `develop` at
`1a1a5ee0dabd9ff36bead4aa78a7c9bae4e9fe91` into the preserved branch using
`--no-ff --no-gpg-sign`. The current sidebar reactivity was retained in the
layout-only shell. Browser validation exposed and fixed a narrow mobile
min-content overflow by allowing both widget hosts to shrink.

Focused recovery validation passed: Angular lint, typecheck, all `478/478`
unit tests, production build, chemistry lazy-boundary check and
`git diff --check`. The build emitted the existing initial-bundle budget
warning and produced the independent
`dashboard-charts-widget-component` lazy chunk.

Fresh ordinary login through `http://localhost:8888/login` succeeded and
proved the protected Dashboard with identity `Test` and existing metrics
`6/0/6/1`. At `1280x800` and `390x844`, metrics and both chart sections
rendered without document overflow; the narrow viewport loaded both deferred
canvas elements. Browser console inspection after Dashboard load contained no
errors. Runtime request logs showed the expected profile/history calls; no
additional dashboard-owned query source was introduced. All task-owned Tox21,
Nest and Angular processes were stopped after validation.

Exact feature-SHA and post-merge CI remain coordinator-owned.
