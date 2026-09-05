# 0074 - Create the canonical pagination and infinite-load primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Create one accessible pagination/infinite-load UI primitive driven by a typed canonical page/cursor model so feature views stop independently implementing page state, load-more controls and pending/error behaviour.

Source: `UI-016` in Series `0001`.

## Context

Pagination, load-more and page state are implemented independently across collection, search and history-like features. The repository already exposes GraphQL page models, but presentation and request-state handling are reconstructed by individual consumers. This task standardizes the UI contract without moving fetching into the component.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/graphql/page.models.ts`
- list/search/history components with pagination/load-more behaviour
- GraphQL services returning paginated data
- canonical `Button` from `0059`
- page/section state primitive from `0070`
- feature facades/state introduced by earlier Angular tasks

## In scope

- Define a canonical typed UI page/cursor state for the pagination shapes currently used by Mercurion.
- Implement accessible previous/next/page/load-more presentation as applicable.
- Standardize pending, terminal/end-of-results and retry/error behaviour.
- Migrate duplicated pagination/load-more UI.
- Keep fetching, caching and query ownership in callers/facades.
- Add state, keyboard and accessibility tests.

## Out of scope

- Changing Nest/GraphQL pagination contracts.
- Choosing a new backend pagination strategy.
- Automatic prefetching or cache policy.
- Generic page loading/error shell already owned by `0070`.

## Decisions already made

- The primitive receives canonical pagination state and emits navigation/load intent; it performs no API requests.
- Request concurrency is caller-owned and must obey the explicit async policies established earlier; the control must not emit duplicate load intent while pending.
- End-of-results is an explicit state.
- Page-number and cursor semantics may use typed adapters when both are genuinely present, but consumers must not probe a bag of optional fields at runtime.
- Controls use native/canonical button/link semantics and expose understandable labels to assistive technology.

## Requirements

1. Inventory all page-number, cursor, infinite-scroll and load-more usages and map them to the actual `PageModel`/GraphQL response shapes.
2. Define a canonical discriminated UI pagination model or typed adapters representing only the pagination modes actually used.
3. Implement accessible controls for previous/next/page selection or load-more according to each declared mode.
4. Prevent repeated activation while a page/load request is pending.
5. Represent first/last/end-of-results and error/retry states deterministically.
6. Preserve caller ownership of request execution, result accumulation/replacement and URL/query state.
7. Migrate compatible feature consumers and remove duplicated pagination UI/state helpers.
8. Ensure focus behaviour is sensible after page changes/load-more and does not unexpectedly jump on content append.
9. Add tests for first/middle/last page, cursor continuation, pending, error/retry, empty/end state and keyboard activation.

## Acceptance criteria

- [ ] Compatible paginated/infinite-load views use one canonical pagination family.
- [ ] Pagination state is typed and does not rely on unsafe optional-property probing.
- [ ] Fetching remains outside the UI primitive.
- [ ] Pending state prevents duplicate intent.
- [ ] End/retry/disabled semantics are consistent and accessible.
- [ ] Existing result ordering and query behaviour remain compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused pagination state/component tests plus representative migrated search/collection/history tests, then the canonical repository CI-parity gate.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`, exercise at least one paginated and one load-more/infinite view when available. Verify keyboard activation, pending/terminal states, focus after updates, repeated-click protection, responsive layout and accessibility names/states.

## Stop conditions

Mark `BLOCKED` if current consumers expose materially incompatible or ambiguous server pagination semantics that cannot be adapted safely without changing the public GraphQL/API contract. Document the contract mismatch rather than inventing cursor/page conversions in the UI.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`
- `0070-create-the-canonical-page-and-section-state-primitive.md`

## Implementation notes

Prefer a small headless state contract plus presentational controls if both numbered pagination and load-more are required. Do not make one component infer its mode from which optional fields happen to be populated.

## Execution notes

### Feature branch
No task branch or worker was created because hard prerequisites
`0059-create-the-canonical-button-primitive.md` (`UI-001`) and
`0070-create-the-canonical-page-and-section-state-primitive.md` (`UI-012`)
are `SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. Both direct UI
prerequisites are terminal `SKIPPED_DEPENDENCY`, with transitive blocked root
cause `0052-standardize-modern-angular-component-apis.md` (`FE-030`).

### Task-specific validation performed
No implementation or validation was performed.

### Full pre-merge CI-parity validation
Not applicable; no feature branch was created.

### Browser validation performed
Not applicable; the task was skipped before implementation.

### Commits
Only this task metadata was updated on `develop`.

### Merge / CI
No feature merge; skip metadata CI is required before continuing.

### Rollback
_Not applicable._

### Blocker / human decision required
No implementation blocker. Re-enable only after the direct prerequisite chains
are deliberately resolved in a new authorized session.