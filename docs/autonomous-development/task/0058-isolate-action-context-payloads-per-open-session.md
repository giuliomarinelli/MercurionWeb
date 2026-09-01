# 0058 - Isolate action context payloads per open session

- [ ] DONE
- [ ] BLOCKED

## Objective

Make every action-overlay opening create an isolated action session with immutable input and one-shot result so scope/payload/pending state from a previous action cannot leak into a later opening.

Source: `FE-036` in Series `0001`.

## Context

Action-specific context services are root singletons and currently hold mutable payload such as collection IDs, import flags, redirect flags and other action input between callers. `ActionOverlayContextService` separately owns the current scope. Closing an overlay does not inherently prove every specialized context was cleared, so reopening the same or another action can observe stale payload/state.

Task `0045` establishes the overlay lifecycle state machine. This task gives each lifecycle instance a concrete immutable input/result boundary.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/action-context/action-overlay-context.service.ts`
- all services under `MercurionWebNg/src/app/services/context/action-context/`
- `MercurionWebNg/src/app/Models/action/action-overlay.models.ts`
- `MercurionWebNg/src/app/components/action-components/action-overlay/action-overlay.component.ts`
- action openers in pages/header/sidenav/molecule/help/settings flows
- action components consuming specialized context payloads

## In scope

- Inventory each action scope and its current input/payload/result/pending state.
- Define typed action-session input/result contracts keyed by action scope.
- Create a fresh session identity/input snapshot on every open.
- Make action inputs immutable for the lifetime of that session.
- Make result delivery one-shot and associated with the originating session.
- Clear all session-owned payload/pending/result state on close/cancel/destroy.
- Remove or narrow root singleton action-context payload stores that can outlive an action session.
- Add stale-session/reopen/result tests.

## Out of scope

- Lazy loading action components.
- Redesigning individual action forms/business rules.
- Generic application-wide modal framework beyond the existing action overlay.
- Changing the visual overlay shell.

## Decisions already made

- Every open creates a new action session even when the same scope opens twice consecutively.
- Input is captured immutably at open time; later caller mutations do not alter the active action.
- Result is one-shot and belongs to the session that produced it.
- Close/cancel/destroy removes payload, pending and result state owned by that session.
- Late async completion from session A cannot mutate or close session B.

## Requirements

1. Enumerate action scopes and specialized context services, including molecule save/add/bind/create/select, profile/sensitive-data, help/ticket actions and any current scope added by execution time.
2. Define a typed mapping from scope to input and result shape, using `void`/empty input where appropriate rather than untyped optional global fields.
3. Change the overlay open API to create and return/track a unique action session containing scope and immutable input.
4. Refactor action components to read only their active session's typed input.
5. Deliver success/cancel/error result through a one-shot session result channel/command rather than persistent singleton fields or anonymous ticks.
6. On close/cancel/destroy, remove all session data and prevent stale timers/promises/Observables from mutating a newer session.
7. Eliminate specialized root context state where it only exists to shuttle payload into an overlay; retain a focused service only when it owns real domain state independent of the overlay.
8. Add tests opening scope A with payload 1, closing, reopening A with payload 2, opening B, and resolving a late async result from the old session; only current-session state may change.
9. Ensure no action can reopen with old pending/success/error state unless that persistence is explicitly part of its product contract.

## Acceptance criteria

- [ ] Every action open has a unique session and typed immutable input.
- [ ] Previous action payload/pending/result state cannot appear in a later opening.
- [ ] Results are one-shot and delivered only to the matching originating session/caller.
- [ ] Late old-session async completion cannot mutate the current overlay/action.
- [ ] Closing/destroying an action clears all overlay-session-owned state.
- [ ] Root action contexts no longer act as persistent payload mailboxes.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run action-session/state-machine tests with deliberate rapid reopen and late-response races, existing action component tests, and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, exercise at least two available action scopes. Open/close/reopen the same action with different entities/input, then switch to another action. Verify no stale IDs/chips/form/pending/error/result state appears and late network completion cannot affect the newer overlay.

## Stop conditions

Mark `BLOCKED` if an action intentionally requires state to survive close/reopen and that persistence is part of product behaviour but is undocumented. Record exactly which state and lifetime require a human decision instead of retaining all singleton payloads.

## Dependencies

- `0045-model-the-action-overlay-as-an-exhaustive-state-machine.md`
- `0047-replace-anonymous-refetch-ticks-with-typed-domain-invalidation.md`

## Implementation notes

A typed `ActionSession<Scope>`/scope-to-contract mapping is preferred over one giant optional payload interface. The active session identity should also be usable as a generation token to reject late async work.

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