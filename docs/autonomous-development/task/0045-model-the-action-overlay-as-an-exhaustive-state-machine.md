# 0045 - Model the action overlay as an exhaustive state machine

- [x] DONE
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
`feature/FE-023` from `6195ab303756247c5c54fe5a18ad8cca6e2560d5`.

### Preflight
Passed unchanged: `npm ci` followed by `npm run ci:check`.

### Preflight remediation
_None._

### Summary
Replaced independent overlay visibility, mount, scope and pending-scope signals with a discriminated lifecycle state machine. The state model makes opening, active, submitting, succeeded, failed, closing, settling and closed states explicit. The controller owns cancellable, generation-bound animation timers, so stale callbacks cannot affect a newer action scope. Readonly derived selectors retain the overlay template's mount, visibility and scope contract; semantic submit-result and cancellation commands are available to action sessions.

### Task-specific validation performed
`npx ng test --watch=false --karma-config=karma.conf.js --include='src/app/services/context/action-context/action-overlay-context.service.spec.ts'` passed: 4 fake-timer lifecycle/state-machine specs covering opening/closing timing, rapid close-to-open scope replacement, repeated submit and result handling, and cancelling a pending submission.

### Full pre-merge CI-parity validation
Passed: `npm ci` followed by `npm run ci:check`, including Angular lint/type/template checks, all Angular tests, Angular production build, Nest lint/typecheck/unit/E2E/build, contracts, GraphQL generated-artifact checks, and registered static policy gates.

### Browser validation performed
Automated validation used because no safe overlay could be exercised through the required development edge. Angular started successfully on its internal port, but `http://localhost:8888/` and `/health` remained `502`; Nest could not start because the local environment is missing all required runtime configuration values, and the read-only Tox21 runtime could not load its `main` module. No production or unsafe action was attempted.

### Commits
- `ca977a8d` `feat(overlay): model action lifecycle state`

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._