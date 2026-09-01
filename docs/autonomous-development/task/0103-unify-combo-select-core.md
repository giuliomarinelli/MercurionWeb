# 0103 - Unify legacy combo-select wrappers on the canonical select core

- [ ] DONE
- [ ] BLOCKED

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
