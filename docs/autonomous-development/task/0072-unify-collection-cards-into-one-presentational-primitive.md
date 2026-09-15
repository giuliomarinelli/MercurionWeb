# 0072 - Unify collection cards into one presentational primitive

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

> Current status (2026-09-15): BLOCKED after implementation because the
> mandatory authenticated browser acceptance probe could not be completed.
> The implementation and focused local checks are preserved on `feature/UI-014`
> for a later human-authorized recovery.

### Feature branch
`feature/UI-014` from base
`5a121da0cbb3a22422b8f7de305b58ff95d622ef`.

### Preflight
- Confirmed clean `feature/UI-014` at the supplied base SHA before editing.
- Exact base CI evidence was green: GitHub Actions CI run `34926756961`
  completed successfully for `5a121da0cbb3a22422b8f7de305b58ff95d622ef`.
- No task-owned Angular, Nest, Tox21, Karma, or workspace watcher was active
  before startup.
- Started Tox21, Nest, and Angular in the required order in separate attached
  sessions. Nest compiled with zero errors and connected to Tox21, Angular
  completed its development build, and two complete edge rounds returned HTTP
  200 for `/health` and `/`.
- The browser profile reached the ordinary login form. A fresh login was
  attempted through the supported `fill_form` flow, but the server rejected
  the configured account password and protected state could not be proved.

### Preflight remediation
_None; the shared account credential requires human-authorized recovery._

### Summary
Implemented one canonical `CollectionCardComponent` presentation with an
immutable `CollectionCardViewModel`, optional typed selection state using the
canonical selection control, separate navigation links and action buttons, and
the existing collection metadata/actions. Migrated the bind-collections
overlay to the canonical card, replaced its select-all wrapper with a native
button, and removed the redundant `CollectionSelectCardComponent` files.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- Angular lint with `--max-warnings=0` — passed.
- Focused collection-card Angular spec — 3/3 passed.
- Representative bind-collections overlay spec — 1/1 passed.
- `npm run build --workspace mercurion_web_ng` — passed; existing initial
  bundle budget warning remained non-fatal.
- `git diff --check` — passed.
- Neither `npm ci` nor `npm run ci:check` was run locally.

### Full pre-merge CI-parity validation
Not run locally by policy. Exact feature-SHA CI remains coordinator-owned.

### Browser validation performed
Runtime startup and two complete readiness rounds were successful after
implementation. The authenticated collection-card route could not be reached:
the supported fresh login attempt at `http://localhost:8888/login` returned
the application error “Le credenziali inserite non sono corrette.” Therefore
normal/selectable card, keyboard, responsive, skeleton, and theme evidence was
not claimed.

### Commits
Implementation and status commit `ea2ef5f45b11b85cbd605534e08faca1d4178b97`
is preserved on `feature/UI-014`.

### Merge / CI
No merge was performed; the feature branch is preserved and frozen pending
human-authorized recovery.

### Rollback
_Not applicable._

### Blocker / human decision required
Human-authorized recovery of the configured local test-account credential is
required, followed by fresh authenticated browser validation through
`http://localhost:8888/login`. The feature branch and preserved work must not
be discarded or rebased.

### Dependency history

The historical dependency-skip note is retained in prior repository history;
the direct owner instruction authorized this implementation attempt.
