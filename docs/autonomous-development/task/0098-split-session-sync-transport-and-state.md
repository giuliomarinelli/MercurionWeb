# 0098 - Split session synchronization transport, protocol and state

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Decompose `SessionSyncService` so realtime connection ownership, session synchronization protocol and application session commands/state are separate adapters with non-overlapping responsibilities.

Source: `NG-012` in Series `0001`.

## Context

`MercurionWebNg/src/app/services/session-sync.service.ts` currently owns retry counters and is consumed by app/login/MFA/settings flows. Earlier FE tasks establish a cancellable realtime connection state machine, scoped listener ownership and one canonical auth/session entity. Task `0097` separates low-level auth transport/session responsibilities. This task must make synchronization use those boundaries instead of rebuilding connection/token/persistence policy in one service.

## Relevant files and modules

- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- canonical realtime state/listener contracts from `0039`/`0040`
- canonical auth/session facade/repositories after `0097`
- app/login/MFA/settings consumers still referencing session sync

## In scope

- Separate socket/realtime connection adapter from synchronization protocol handling.
- Separate protocol message mapping/ack/error classification from application session commands.
- Expose a minimal public session-sync facade that publishes typed state and explicit commands only.
- Remove duplicated lock/retry/token/persistence logic already owned by canonical connection/session layers.
- Migrate consumers away from implementation-level socket/session methods.
- Add tests for connection state transitions, protocol messages, reconnect/session-expiry behavior and cleanup.

## Out of scope

- Do not redesign server Socket.IO/session protocol beyond the canonical contract already established by SYS/FE tasks.
- Do not introduce a second auth/session store.
- Do not weaken retry bounds/timeouts/terminal states established by `0039`.
- Do not let UI components subscribe directly to raw socket events.

## Decisions already made

- Connection lifecycle has one owner.
- Protocol translation is pure/typed where possible and independent from UI state.
- Application session state is mutated only through canonical auth/session commands.
- Reconnect/logout/destroy removes obsolete listeners and cancels pending work.

## Requirements

1. Define narrow interfaces for connection transport, session-sync protocol and public sync facade.
2. Preserve bounded retry/jitter/cancellation and terminal failure state.
3. Ensure unauthorized/session-expired outcomes are emitted once through canonical session invalidation.
4. Prevent duplicate listeners after repeated reconnect cycles.
5. Keep persistence/token details out of the socket protocol adapter.
6. Migrate existing consumers to state selectors/commands rather than internal methods.

## Acceptance criteria

- [ ] No class owns socket connection, protocol mapping, persistence and UI-facing session state together.
- [ ] Public session-sync API exposes only typed state/selectors and commands.
- [ ] Reconnect/logout/destroy lifecycle is deterministic and leak-free.
- [ ] Repeated unauthorized/socket failures cannot cause duplicate logout/session invalidation.
- [ ] Existing login/MFA/settings/app-shell behavior remains compatible.

## Validation

Run focused realtime/session-sync tests including reconnect/listener teardown, then canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, test normal authenticated realtime connection, reload, disconnect/reconnect if safely reproducible, logout and cross-session cleanup. Inspect Socket.IO frames/network and ensure no duplicated event handling or relevant console errors.

## Stop conditions

Mark `BLOCKED` if the canonical server session-sync protocol is inconsistent with the typed contract established by earlier SYS tasks and resolving it requires a protocol decision.

## Dependencies

- Realtime state/listener tasks `0039` and `0040` must be `DONE`.
- `0097` must be `DONE`.

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
