# 0100 - Introduce a reusable typed collection-picker feature

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Extract the duplicated collection query/selection/feedback flow used by custom save, bind-collections, select-collection and create-related actions into one reusable collection-picker feature with explicit typed modes.

Source: `NG-014` in Series `0001`.

## Context

The action-components tree contains `custom-molecule-collection-item-save`, `bind-collections-to-molecule`, `select-collection-then-route`, `create-collection` and related flows. Existing components use legacy `ComboSelectComponent`/`ComboMultiSelectComponent` and repeat collection querying/selection/action wiring. Task `0089` has already separated add-molecules flow responsibilities; task `0101` will centralize naming/chip collision rules and task `0103` will remove combo-select cloning by adapting to the canonical select core.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/custom-molecule-collection-item-save/`
- `MercurionWebNg/src/app/components/action-components/bind-collections-to-molecule/`
- `MercurionWebNg/src/app/components/action-components/select-collection-then-route/`
- `MercurionWebNg/src/app/components/action-components/create-collection/`
- `MercurionWebNg/src/app/components/action-components/add-molecules-to-collection/`
- molecule collection GraphQL service/models
- canonical select/selection/action primitives

## In scope

- Define a reusable collection-picker feature/facade with typed operation modes instead of boolean/string option combinations.
- Centralize collection querying, paging/search, selection identity and shared feedback state used by the action flows.
- Support the actual existing single/multi-selection and route/bind/save use cases through typed adapters/commands.
- Migrate the listed action components to the shared feature while leaving their domain-specific submit commands outside the picker.
- Reuse canonical collection-card/select/pagination primitives and prepare legacy combo wrappers for removal/adaptation in `0103`.
- Add tests for each supported mode and caller integration.

## Out of scope

- Do not put create/save/bind business mutations inside a generic UI picker.
- Do not encode caller behavior as untyped callbacks or strings.
- Do not duplicate naming/collision/chip helper rules owned by `0101`.
- Do not implement a second select/combobox accessibility core.

## Decisions already made

- Picker responsibility ends at discovering/selecting collection identities and exposing typed selection state/events.
- Caller-specific submit/mutation remains in the caller facade/use case.
- Single and multi modes are explicit discriminated variants.
- Canonical UI selection/card/pagination primitives are reused.

## Requirements

1. Define stable collection-picker input/output models and discriminated modes.
2. Keep selected identities stable across search/page refresh and prevent duplicate selection entries.
3. Provide loading/error/empty states and cancellation/teardown.
4. Ensure selection state is fresh per action session unless a caller explicitly supplies an initial selection.
5. Migrate all targeted action callers without feature-specific branches in the picker core.
6. Add integration tests proving caller-specific commands receive the correct selected collection ids/models.

## Acceptance criteria

- [ ] Custom save, bind, select-route and other targeted collection action flows share one picker feature.
- [ ] Query/paging/selection logic is no longer copied among callers.
- [ ] Single/multi modes are compile-time typed.
- [ ] Caller-specific domain mutations remain outside the picker.
- [ ] Close/reopen and query changes cannot leak stale selection state.

## Validation

Run collection-picker unit/integration tests for every migrated mode/caller and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise each reachable migrated action: search collections, select/deselect, create/route/bind/save handoff where applicable, cancel/reopen and responsive/keyboard behavior. Verify network requests are not duplicated and no relevant console errors occur.

## Stop conditions

Mark `BLOCKED` if two current callers require genuinely incompatible collection-selection semantics that cannot be represented by explicit typed modes without a product decision.

## Dependencies

- `0089` must be `DONE` where its extracted selection/search seams are reused.
- Canonical collection card, select and pagination UI tasks must be `DONE`.

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
