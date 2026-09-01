# 0045 - Model the action overlay as an exhaustive state machine

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the action overlay's independent `opened` / `mounted` / `visible` / `scope` / `pendingScope` flags and implicit timer transitions with one exhaustive state model covering open, active, submit/pending, success, error, cancellation and close lifecycle.

Source: `FE-023` in Series `0001`.

## Context

`ActionOverlayContextService` currently coordinates multiple signals plus three timers. `open()` writes `_pendingScope`, an effect later copies it into `_scope` and opens the overlay; another effect controls mount/visibility with delayed timers; `close()` hides the overlay and clears scope later. Action components separately implement pending/success/error state, which makes invalid combinations and stale transitions possible.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/action-context/action-overlay-context.service.ts`
- `MercurionWebNg/src/app/components/action-components/action-overlay/action-overlay.component.ts`
- `MercurionWebNg/src/app/Models/action/action-overlay.models.ts`
- action components under `MercurionWebNg/src/app/components/action-components/`
- action-specific context services

## In scope

- Define a discriminated overlay/action lifecycle state with legal events/transitions.
- Eliminate contradictory boolean/scope combinations.
- Make opening, submit/pending, success, error, cancel and close explicit transitions where they belong to the overlay/action session.
- Make transition timers cancellable and owned by the state machine.
- Preserve current animation timing/visual behaviour unless another task changes it.
- Add exhaustive transition tests.

## Out of scope

- Final per-open immutable payload/result isolation; task `0058` owns that.
- Lazy loading action components; later NG task owns registry/lazy loading.
- Dialog visual/accessibility redesign.
- Domain-specific submit logic inside individual actions.

## Decisions already made

- Overlay lifecycle is represented by one discriminated state, not independent booleans.
- Illegal transitions fail safely and are test-visible.
- The last valid user/action intent wins over stale timer callbacks.
- Child domain actions may keep domain-specific form state, but overlay/session phase is not duplicated independently in multiple contexts.

## Requirements

1. Inventory current combinations of opened/mounted/visible/scope/pending scope and action pending/success/error transitions.
2. Define explicit states/events sufficient for closed, opening, active/idle, submitting, succeeded, failed, cancelling/closing and any animation-only phase actually required.
3. Make state transitions exhaustive in TypeScript.
4. Replace delayed writes with cancellable transition scheduling tied to the current state/session generation.
5. Ensure `open()` during a closing transition cannot resurrect the prior scope through an old timer.
6. Expose readonly selectors needed by the template without leaking mutable internal signals.
7. Give action components semantic commands/events for submit result/cancel instead of manually manipulating overlay visibility state.
8. Add fake-timer tests for rapid open→close, close→open new scope, repeated submit, success/error then close and cancellation during pending state.

## Acceptance criteria

- [ ] Overlay lifecycle is represented by one exhaustive state model.
- [ ] Contradictory combinations such as unmounted+visible or empty scope+open cannot be represented as valid states.
- [ ] Stale timers cannot mutate a newer overlay state.
- [ ] Submit/success/error/cancel/close transitions are explicit and tested.
- [ ] Existing overlay rendering/animation remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused state-machine tests with fake timers plus existing action/overlay specs and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, exercise at least one available action overlay: open, close, reopen quickly, submit a safe action or validation failure, then open a different action. Verify no stale scope/pending UI appears, Escape/backdrop behaviour remains as currently supported, and console has no transition errors.

## Stop conditions

Mark `BLOCKED` if a current action requires product-specific close/cancel semantics that conflict with a unified state transition and the intended behaviour is undocumented. Keep the domain distinction explicit rather than guessing.

## Dependencies

- None.

## Implementation notes

A reducer-like pure transition function plus a small controller for timers/side effects is preferred. Do not merely wrap the existing five signals in an object while retaining implicit effects.

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