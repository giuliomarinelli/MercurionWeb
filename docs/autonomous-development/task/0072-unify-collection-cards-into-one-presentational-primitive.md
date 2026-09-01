# 0072 - Unify collection cards into one presentational primitive

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace divergent collection-card and collection-select-card presentation with one canonical collection card that supports optional selectable state and projected/configured actions without forking markup.

Source: `UI-014` in Series `0001`.

## Context

The repository contains `CollectionCardComponent` and `CollectionSelectCardComponent`; the latter composes/augments selection behaviour while collection presentation also appears in route and overlay contexts. The audit identified duplicated presentation/selection logic that should converge on one visual primitive.

## Relevant files and modules

- `MercurionWebNg/src/app/components/molecule-detail/collection-card/`
- `MercurionWebNg/src/app/components/molecule-detail/collection-select-card/`
- collection list/detail/action-overlay consumers
- collection GraphQL DTO/view-model types
- canonical selection control from `0066`
- interaction semantics from `0067`

## In scope

- Define a transport-independent collection-card view model if needed.
- Make one canonical presentational card responsible for collection visual metadata/layout.
- Support optional selectable mode without duplicating the card.
- Support actions/links through explicit slots/configuration.
- Migrate route/list/overlay usages.
- Remove duplicated card/select-card markup once no longer needed.
- Add component and integration tests.

## Out of scope

- Collection fetching/mutation business logic.
- Pagination (`0074`).
- General molecule-card normalization (`0073`).

## Decisions already made

- Collection presentation has one source; selection is an optional behaviour layered onto that presentation.
- Card navigation and selection actions remain semantically distinct and keyboard accessible.
- API DTOs are adapted to a view model rather than extended with UI-only state.
- Feature actions are injected/projected/configured; the card does not import domain services.

## Requirements

1. Compare `CollectionCardComponent` and `CollectionSelectCardComponent` markup, metadata, actions and state.
2. Define a canonical immutable collection summary/view model containing only fields needed to render the card.
3. Implement optional selected/selectable state using canonical selection semantics.
4. Ensure navigation target/action controls use correct link/button semantics and do not conflict with card selection.
5. Migrate all consumers while preserving IDs, labels, dates/counts and existing actions.
6. Remove redundant wrapper/card implementation after migration.
7. Update related skeleton geometry from `0071` if the canonical layout changes.
8. Add tests for normal, selectable, selected, disabled/unavailable-action and navigation states.

## Acceptance criteria

- [ ] One canonical collection-card presentation remains.
- [ ] Selection is an optional typed mode, not a forked template.
- [ ] Domain DTOs contain no new UI-only selection fields.
- [ ] Card action/navigation semantics are keyboard accessible and non-conflicting.
- [ ] Route and overlay consumers use the same presentation.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run canonical card/select integration tests, representative collection page/action tests and canonical CI-parity validation.

## Browser validation

Via `http://localhost:8888`, inspect collection cards in normal and selectable contexts. Verify selection, navigation/actions, keyboard focus, selected state, responsive layout, skeleton replacement and light/dark themes.

## Stop conditions

Mark `BLOCKED` if route and overlay collection cards intentionally expose incompatible product metadata/actions and repository evidence does not establish a common presentation contract. Do not hide behaviour differences behind arbitrary boolean flags.

## Dependencies

- `0066-create-the-canonical-selection-control-primitive.md`
- `0067-normalize-interactive-element-semantics.md`
- `0071-consolidate-progress-indicators-and-skeletons.md`

## Implementation notes

Favor one small presentational card plus explicit slots/typed action descriptors over a component with many feature booleans.

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