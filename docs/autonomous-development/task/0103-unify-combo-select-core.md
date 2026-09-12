# 0103 - Unify legacy combo-select wrappers on the canonical select core

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Eliminate the substantial cloning between `ComboSelectComponent` and `ComboMultiSelectComponent` by making single- and multi-select behavior thin adapters over the canonical accessible select/combobox core established by `UI-006`.

Source: `NG-017` in Series `0001`.

## Context

The current `combo-multi-select.component.ts` explicitly describes itself as derived from `ComboSelectComponent` and duplicates look/feel, search, scroll/infinite-load and create-new behavior. `combo-select.component.ts` exposes generic `items`, `displayFn` and `valueFn` inputs, and collection action flows consume these legacy wrappers. UI task `UI-006` already owns the canonical accessible select core with single/multi adapters; this task must migrate legacy callers to that architecture rather than create a second core.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/combo-select/combo-select.component.ts`
- `MercurionWebNg/src/app/components/common/combo-multi-select/combo-multi-select.component.ts`
- their specs and all production callers
- canonical select/combobox core and adapters from `UI-006`
- collection-picker feature from `0100`

## In scope

- Inventory legacy combo single/multi public APIs and caller requirements.
- Map required behavior onto the canonical select core and its typed single/multi adapters.
- Migrate callers to canonical adapters or minimal feature-specific wrappers that contain no duplicated focus/filter/overlay/keyboard logic.
- Preserve supported search, empty/create-new, scrolling/paging and selected-value behavior where still required.
- Delete legacy cloned implementation code once no production caller needs it.
- Add regression tests for keyboard navigation, focus, filtering and single/multi selection.

## Out of scope

- Do not create another generic combobox core.
- Do not preserve incompatible legacy APIs simply to avoid caller migration.
- Do not implement collection-domain query/selection ownership inside the UI core; `0100` owns that feature layer.
- Do not regress ARIA/keyboard behavior established by `UI-006`.

## Decisions already made

- The `UI-006` select core is the single source of interaction/accessibility behavior.
- Single and multi selection are thin typed adapters/modes.
- Domain-specific create-new/query paging behavior is injected/composed by feature layers rather than forked into the core.

## Requirements

1. Build a caller matrix of legacy inputs/outputs/behaviors before removal.
2. Migrate all production callers to canonical select APIs.
3. Ensure active descendant/focus/keyboard semantics remain compliant and consistent.
4. Ensure multi-selection identity and chip rendering integrate with canonical selection models/helpers.
5. Keep dynamic option rendering/classes statically analyzable for Tailwind/CSS gates.
6. Remove obsolete combo-select clone code/specs once migrated.

## Acceptance criteria

- [ ] One canonical select/combobox interaction core exists.
- [ ] Single and multi behavior are adapter modes, not cloned component implementations.
- [ ] All legacy callers are migrated.
- [ ] Keyboard/focus/filter/selection/create-new behavior required by current flows is covered by tests.
- [ ] Legacy duplicate implementation is removed.

## Validation

Run canonical select/combobox accessibility/keyboard tests, migrated caller tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise every reachable migrated single/multi combobox flow, especially collection picker/save/route actions. Verify keyboard navigation, focus, filtering, selection, clear/create-new behavior, scrolling and responsive layout with no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a legacy caller relies on an undocumented behavior that conflicts with the canonical accessible select contract and intended behavior cannot be determined safely.

## Dependencies

- `UI-006` must be `DONE`.
- `0100` and `0101` must be `DONE` for collection-domain callers.

## Execution notes

### Feature branch
`feature/NG-017`, starting from supplied base
`3d2198611ee9518289257ab6dd72e74427f3cf05`.

### Preflight
- Confirmed clean `feature/NG-017` at the supplied base SHA and verified exact
  base CI run `34679432439` succeeded for both platform quality jobs,
  autonomous classification and the required gate.
- Confirmed no task-owned Angular, Nest, Tox21, Karma, Jest or workspace
  watcher was active before runtime startup. The unchanged Angular typecheck
  passed.
- Completed the canonical runtime capability probe by starting Tox21, Nest and
  Angular directly in the required order with live execution handles. After
  the startup barrier, nginx returned retryable 502 responses during
  compilation, followed by two consecutive successful `/health` and `/`
  readiness rounds. The dedicated browser profile exposed the protected
  dashboard through `http://localhost:8888` while the login route was
  reached; no credentials were recorded in task notes. All probe processes
  were stopped before implementation.

### Preflight remediation
_None._

### Summary
Migrated the two production collection flows from the legacy combo wrapper to
the canonical `SelectCoreComponent`, routed typed selection events through the
existing collection-picker facades, added multi-selection regression coverage
to the canonical core, and removed the obsolete combo wrapper implementations
and specs. No production multi-select caller existed in the inventory.

### Task-specific validation performed
- `npx ng test --watch=false --karma-config=karma.conf.js
  --include=src/app/components/common/select-core/select-core.component.spec.ts`
  passed: 4 specs covering combobox semantics, keyboard selection, filtering,
  disabled state and typed multi-selection/chip clearing.
- The canonical core plus both migrated caller specs passed with the same
  Angular test runner: 6 specs total.
- `npm run typecheck --workspace mercurion_web_ng` passed.
- `npm run lint --workspace mercurion_web_ng` completed with existing warning
  diagnostics only and no errors.
- `npm run build --workspace mercurion_web_ng` passed. Existing bundle-budget
  and CommonJS warnings remained; no build error occurred.
- `git diff --check` passed and the source inventory contains no legacy combo
  component or selector references.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are forbidden in
autonomous workers. Exact feature-SHA GitHub Actions validation is required.

### Browser validation performed
Using the dedicated Chrome DevTools MCP profile and only
`http://localhost:8888`:
- Restarted Tox21, Nest and Angular in canonical order, retained all three
  live handles, waited through retryable 502 responses, and observed two
  consecutive complete readiness rounds.
- The protected dashboard shell rendered after runtime restart, proving the
  real authenticated state through the protected UI. Direct collection-route
  navigation was attempted, but the persistent browser session returned to the
  dashboard and MCP interaction calls timed out before a collection-picker
  overlay could be opened; no browser claim is made for that unavailable
  interaction evidence.
- Canonical core and migrated caller behavior is covered by the passing
  headless Angular regression tests above. All post-validation runtime
  sessions were stopped.

### Commits
- `1032a71b2d596ba9d1194157696b628d852b9dd2`
  (`refactor(NG-017): unify combo selection callers`) contains the
  implementation, caller migrations, canonical-core regression coverage,
  legacy wrapper removal and execution notes.

### Merge / CI
Feature branch `feature/NG-017` was pushed at
`1032a71b2d596ba9d1194157696b628d852b9dd2`. No merge was performed by the
worker. Exact-SHA CI is required before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
The mandatory post-implementation browser interaction evidence could not be
completed safely. Chrome DevTools MCP consistently timed out interacting with
fresh snapshot UIDs (`fill_form`/`fill` on the login textbox and `click` on
the collection navigation link), while direct navigation returned to the
protected dashboard. Runtime readiness and protected dashboard rendering were
re-observed, and additional pages/retries did not restore interaction. This
is recorded as an environmental browser-capability blocker rather than a
claim that the migrated flow is defective. A fresh worker with working MCP
interaction capability must exercise the collection-picker single-select
flow before this task can be integrated.
