# 0039 - Refactor realtime connection into a cancellable state machine

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace dispersed/manual Socket.IO lock, polling and retry behaviour with one explicit cancellable connection state machine using bounded backoff, jitter, timeouts and observable terminal/degraded states.

Source: `FE-017` in Series `0001`.

## Context

`RealtimeSocketService` currently combines Socket.IO built-in infinite reconnection (`reconnectionAttempts: Infinity`), custom `connectInFlight`, timestamp throttling, a serialized `modeOp` promise, token refresh locking via `AuthService`, manual reconnects and auth-refresh messages. `SessionSyncService` adds another handshake loop (`MAX_TRIES = 15`, one-second interval), unauthorized retries, cooldowns, pending/restart flags and its own session statuses.

The pieces work toward public/private mode convergence but ownership of retry, cancellation and terminal state is spread across services. `0010` and `0009` define the session/event protocol; `0038` supplies one coherent client session.

## Relevant files and modules

- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/services/auth.service.ts`
- canonical auth store/client session from `0026` / `0038`
- typed Socket.IO registry from `0009`
- server gateway/guard under `MercurionWebNode/src/app_modules/socket.io/`
- Socket.IO client configuration/tests

## In scope

- Define explicit realtime connection states and legal transitions for public/private/connect/reconnect/degraded/terminal conditions.
- Consolidate retry/backoff/cancellation ownership.
- Bound reconnect/handshake attempts according to an explicit policy rather than infinity plus independent loops.
- Add jitter and timeout where retries can synchronize/spam services.
- Make auth/session change cancel superseded connection attempts.
- Expose state observably to session/auth consumers without them implementing their own polling loops.
- Add deterministic fake-timer/state-machine tests.

## Out of scope

- Changing Socket.IO event names/payload contracts beyond using the typed registry from `0009`.
- Replacing Socket.IO with another realtime transport.
- Server Redis adapter architecture.
- Cross-tab auth design (`0030`) beyond consuming current-session token changes.
- Generic application retry framework.

## Decisions already made

- Realtime connection lifecycle has one owner/state machine.
- Public mode remains a supported connected mode; failure to authenticate private mode must not create an uncontrolled reconnect loop.
- Retry is bounded, cancellable and observable, with backoff+jitter rather than fixed infinite polling.
- Newer intent wins: logout, session replacement or explicit public downgrade cancels obsolete private-upgrade/retry work.
- Terminal/degraded state is surfaced to the canonical session/auth layer; hidden infinite retry is not an acceptable terminal policy.
- Retry policy must preserve the server session protocol defined by `0010`.

## Requirements

1. Inventory all current reconnection/retry mechanisms in `RealtimeSocketService`, `SessionSyncService` and auth WS-token refresh code, including Socket.IO built-in reconnection options.
2. Define a discriminated realtime state model covering at minimum disconnected/connecting public, public, upgrading/authenticating private, private, reconnect/backoff, degraded/terminal and intentionally stopped states as needed by the protocol.
3. Define events/commands for connect public, upgrade private, token rotated, auth rejected, transport disconnected, session expired, logout/downgrade and explicit retry/reset.
4. Ensure every transition has one cancellation scope/generation/abort mechanism so late promises/timers/ACKs from a prior attempt cannot mutate the new state.
5. Replace fixed/infinite retry layers with one bounded exponential/backoff policy including jitter and maximum delay/attempt or elapsed-time bound. If exact limits are not already documented, use conservative implementation defaults only if they are operational rather than product semantics and document them; otherwise request a decision.
6. Integrate WS token refresh through `0038`'s current-session operation and reject late refresh output after logout/session replacement.
7. Replace `SessionSyncService` handshake polling/restart flags with state-machine events/selectors or reduce it to a thin session coordinator consuming realtime state.
8. Ensure public mode remains stable without repeated private handshake attempts when no authenticated session exists.
9. Expose meaningful status/retry metadata to diagnostics/reporting without leaking tokens.
10. Add fake-timer tests for successful connect, public→private, disconnect/reconnect, auth rejection+refresh, retry exhaustion, logout during backoff, session replacement during refresh, offline/online recovery and no reconnect storm.

## Acceptance criteria

- [ ] One realtime state machine owns connection/reconnect/upgrade/downgrade lifecycle.
- [ ] No independent infinite/fixed polling loop competes with that owner.
- [ ] Reconnect attempts are bounded, cancellable and use backoff with jitter.
- [ ] Logout/session replacement cancels obsolete pending retries/ACK/token refresh work.
- [ ] Anonymous users remain stably connected/public according to current product behaviour without private retry noise.
- [ ] Retry exhaustion/degraded state is observable and does not spin forever.
- [ ] Private reconnect uses only credentials belonging to the current client session.
- [ ] Deterministic timing/state tests and Angular build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run targeted state-machine tests with fake timers; tests must finish without real sleeps and assert timer/listener cancellation after each scenario.

Run affected Nest Socket.IO tests if client/server handshake expectations change during refactor.

## Browser validation

Mandatory through `http://localhost:8888` with Chrome DevTools MCP when authentication is available:

1. Load anonymously and verify one stable public Socket.IO connection.
2. Authenticate and verify the client performs the intended public→private transition without a reconnect storm.
3. Temporarily interrupt connectivity or stop/restart the applicable backend process and observe bounded reconnect/backoff behaviour in Network/console.
4. Restore connectivity and verify recovery to the appropriate current-session mode.
5. Logout during/after reconnect activity and verify pending private retries stop and the client settles to the supported public/anonymous state.

Do not include tokens in screenshots/reports.

## Stop conditions

Mark `BLOCKED` if the server's required public/private/auth-refresh handshake semantics conflict with `0010` or are insufficiently specified to define safe transitions. Also block if choosing retry-exhaustion user behaviour (permanent stop vs manual retry vs background retry after a long interval) is a product decision not documented; state the technical alternatives.

## Dependencies

- `0009-create-typed-socket-io-event-registry.md`
- `0010-unify-session-state-protocol.md`
- `0038-create-one-atomic-client-session-entity.md`

## Implementation notes

Do not simply wrap the existing flags in a class named state machine. The result should reduce independent timers/flags and make legal transitions/cancellation testable from one reducer/controller. Socket.IO's own reconnection may be used if it can be configured as the single retry engine and integrated with the explicit state machine; otherwise disable competing built-in retry behaviour and own it explicitly.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._