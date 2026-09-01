# 0046 - Unify loading and search transition control

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace duplicated, uncancelled mount/visibility timers in `LoadingContextService` and `SearchContextService` with one deterministic cancellable transition controller where the latest intent always wins.

Source: `FE-024` in Series `0001`.

## Context

Both services independently maintain a primary open/loading signal plus `isMounted` and `isVisible`, then use `setTimeout(..., 10)` for showing and `setTimeout(..., 300)` for unmounting. Existing callbacks are not cancelled when intent reverses quickly, so an obsolete timeout can mutate state after a later start/open/stop/close.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/loading-context.service.ts`
- `MercurionWebNg/src/app/services/context/search-context.service.ts`
- loading/search overlay components and consumers
- transition timing constants/styles used by the corresponding UI

## In scope

- Create one small reusable transition controller/primitive for mounted-visible lifecycle.
- Cancel obsolete show/unmount timers when intent changes.
- Preserve existing transition durations unless a shared canonical constant already exists.
- Make state readonly to consumers where practical.
- Migrate both loading and search contexts to the shared primitive.
- Add deterministic fake-timer tests for rapid reversals.

## Out of scope

- General animation framework or design-system refactor.
- Action overlay state machine; task `0045` owns that richer lifecycle.
- Search query/data-flow redesign.
- Changing loading/search UX timing.

## Decisions already made

- Latest intent wins.
- No stale timer may change mount/visibility after a newer intent.
- Mount/visibility transition mechanics are infrastructure and should not be duplicated by each context.
- Tests use fake time, not real sleeps.

## Requirements

1. Extract the shared semantics from the two current services without coupling their domain commands.
2. Provide explicit `open/start` and `close/stop` intent to a transition controller that owns timer handles/generation.
3. Cancel/revoke pending show/unmount work on every superseding intent.
4. Guarantee state invariants such as visible implies mounted.
5. Expose domain-friendly APIs (`start/stop`, `open/close`) while sharing only transition mechanics.
6. Ensure teardown clears outstanding timers if the owner can be destroyed.
7. Add fake-timer tests for open→close before show, close→open before unmount, repeated identical intents and final teardown.

## Acceptance criteria

- [ ] Loading and search no longer duplicate raw mount/visibility timeout logic.
- [ ] Stale callbacks cannot override newer state.
- [ ] Visible state cannot survive after unmount.
- [ ] Repeated rapid open/close sequences settle deterministically to the latest intent.
- [ ] Existing UI transition timing remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused context/controller tests under fake timers, affected overlay/component tests and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, rapidly open/close the search overlay and exercise an available loading transition. Confirm there is no delayed remount/flicker after close, no hidden-but-mounted stale overlay beyond the intended transition, and no console errors.

## Stop conditions

Mark `BLOCKED` only if the two contexts intentionally require incompatible transition semantics not represented by current code/styles. Document the difference rather than forcing a misleading shared abstraction.

## Dependencies

- None.

## Implementation notes

Share the state-transition mechanism, not the domain service. A tiny controller/composable with cancellable timers is preferable to merging Loading and Search into one generic global context.

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