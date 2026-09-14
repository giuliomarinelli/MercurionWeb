# 0098 - Split session synchronization transport, protocol and state

- [x] DONE
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
`feature/NG-012`, base `d4ae32bdd085764cf893547a8e1f9012290a42eb`.

### Preflight
Confirmed clean `feature/NG-012` at the supplied base SHA and no task-owned
Angular, Nest, Tox21, or test-watcher process was active. The exact base SHA
has successful full CI run `34793028934` with successful Ubuntu and Windows
prerequisite jobs, build/test jobs, and the stable `Required gate`; local
`commit.gpgSign` is `false`. No `npm ci` or `npm run ci:check` was run.
Prerequisites 0039, 0040, and 0097 were already DONE.

### Preflight remediation
None.

### Summary
Split the former all-in-one session synchronization service into a public typed
facade, a transport/lifecycle adapter, and a pure protocol translation
boundary. Reused the canonical realtime socket owner, kept bounded retry and
generation cancellation there, made server session invalidation idempotent, and
migrated app-shell and local-auth consumers to the facade command
`checkSession`.

### Task-specific validation performed
* `npm run typecheck --workspace mercurion_web_ng` — passed.
* `npm run lint:angular --workspace mercurion_web_ng` — passed.
* `npm run test:onpush --workspace mercurion_web_ng` — `480 SUCCESS`.
* Runtime preflight and post-change validation used the required direct
  Tox21, Nest, then Angular sessions. Both phases reached two consecutive
  `200/200` nginx readiness rounds after transient upstream `502` responses.

### Full pre-merge CI-parity validation
Not run locally by policy; exact feature-SHA GitHub Actions evidence remains
coordinator-owned.

### Browser validation performed
Using the dedicated persistent Chrome DevTools profile and only
`http://localhost:8888`: fresh ordinary login with snapshot plus `fill_form`
for both credentials reached the protected Dashboard (`Benvenuto Test`,
account menu and authenticated API responses `200`); reload preserved the
server-accepted protected state; logout navigated to `/welcome` and removed
the authenticated UI. Console inspection after reload had no application
errors or warnings. A transient Angular rebuild produced nginx `504` during
one navigation; after the canonical runtime remained alive and the edge
returned `200`, reload succeeded and validation completed.

### Commits
Implementation and execution-note commits are recorded on `feature/NG-012`
and will be pushed after the task-specific commits exist.

### Merge / CI
Not started.

### Rollback
_Not applicable._

### Blocker / human decision required
None.


### Dependency skip

Cleared on 2026-09-13 after task 0097 (`NG-011`) reached `DONE`.
