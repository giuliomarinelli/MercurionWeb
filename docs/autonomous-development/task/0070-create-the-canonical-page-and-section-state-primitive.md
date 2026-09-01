# 0070 - Create the canonical page and section state primitive

- [ ] DONE
- [ ] BLOCKED

## Objective

Create one exhaustive page/section state primitive for loading, empty, error, content and retry presentation so feature views stop representing asynchronous state with unrelated local markup and branching conventions.

Source: `UI-012` in Series `0001`.

## Context

Loading, empty, error and retry states are currently rendered differently across features. Some views switch between spinners/skeletons/content, others embed error text or retry buttons locally. This produces inconsistent semantics and often permits impossible combinations such as content and error flags being true simultaneously.

## Relevant files and modules

- list/search/detail pages and action components with async state
- `LoadingContextService` replacement/controller from `0046`
- existing spinner/skeleton components
- canonical Button from `0059`
- progress/skeleton consolidation task `0071`

## In scope

- Define an exhaustive discriminated UI-state contract.
- Implement a stateless renderer/shell for loading, empty, error, content and retry states.
- Standardize accessible status/error/empty semantics.
- Migrate representative and then compatible feature state branches.
- Ensure retry is an explicit caller command/action.
- Add state/component tests.

## Out of scope

- Choosing which spinner/skeleton visual is canonical (`0071`).
- Network retry/backoff policy.
- Domain-specific error-message mapping.

## Decisions already made

- View state is mutually exclusive through a discriminated union rather than independent booleans.
- The feature/facade owns data fetching and retry command; the primitive only renders state and emits retry intent.
- Error details exposed to users remain public/safe messages from the canonical error model.
- Loading state may project a task-appropriate skeleton, while the surrounding state semantics remain canonical.

## Requirements

1. Inventory common async view-state branches and identify their current state combinations.
2. Define a discriminated state type that makes impossible combinations unrepresentable.
3. Implement canonical loading/empty/error/content/retry regions with correct ARIA status/alert semantics.
4. Support projected content and projected/configured loading skeleton without coupling to feature services.
5. Use canonical Button for retry actions.
6. Migrate compatible page/section state handling without changing fetch/retry policy.
7. Add tests for every state and state transition, including no stale content leaking into terminal error/empty states unless explicitly part of the chosen state.

## Acceptance criteria

- [ ] Compatible async views use one exhaustive state contract/primitive.
- [ ] Loading, empty, error and content cannot be simultaneously represented through unrelated booleans.
- [ ] Retry is accessible and caller-owned.
- [ ] Public error/empty semantics are consistent.
- [ ] Existing fetch behaviour remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run state primitive tests and representative migrated page/facade tests, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, exercise or fixture representative loading, empty, error/retry and content states. Inspect status/error semantics, focus after retry and mobile/dark rendering.

## Stop conditions

Mark `BLOCKED` if a feature requires a materially distinct stale-data/revalidation state whose product semantics are not specified. Do not collapse stale content into ordinary loading/error without an explicit decision.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`
- `0046-unify-loading-and-search-transition-control.md`

## Implementation notes

The primitive may expose a typed stale/revalidating variant only if existing repository behaviour clearly requires and defines it; otherwise keep the state machine minimal.

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
