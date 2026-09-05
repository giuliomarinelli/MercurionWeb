# 0040 - Own and release Socket.IO listeners deterministically

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Give every Socket.IO event handler/subscription an explicit connection/session lifecycle owner and guarantee deterministic teardown on unsubscribe, reconnect, logout/session replacement and service destruction so listeners cannot accumulate or fire against stale state.

Source: `FE-018` in Series `0001`.

## Context

`RealtimeSocketService.on()` creates RxJS observables whose unsubscribe callback removes the corresponding Socket.IO handler and tracks handlers in a local `listeners` array. However application-lifetime core listeners and a `window.storage` listener are registered in the service constructor, while `SessionSyncService` subscribes to `onConnect`, `onDisconnect`, `sv.pub.err` and `sv.pub.session_expired` without an explicit teardown owner. Reconnect/public-private transitions also coexist with `socket.off()` in `disconnect()`.

After `0039`, realtime connection lifecycle has one state-machine owner. This task makes listener lifetime obey that same boundary.

## Relevant files and modules

- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- all callers of `.on(...)`, `.onConnect()`, `.onDisconnect()` and direct Socket.IO listener registration
- cross-tab/storage listener code related to realtime auth
- realtime state machine introduced by `0039`
- Angular lifecycle helpers (`DestroyRef`, `takeUntilDestroyed`) where appropriate
- Socket.IO client test doubles

## In scope

- Inventory every realtime listener/subscription and assign a lifecycle owner.
- Make feature/session subscriptions unsubscribe deterministically.
- Separate permanent socket-core listeners from per-connection/per-session/per-feature listeners.
- Ensure reconnect/rebind cannot duplicate handlers.
- Ensure logout/session replacement removes listeners tied to the old private session where required.
- Add listener-count/idempotency lifecycle tests.

## Out of scope

- General cleanup of every RxJS/DOM listener in the Angular app (`FE-027` / `FE-028` handle broader lifecycle work).
- Rewriting the event registry (`0009`) or connection retry state machine (`0039`).
- Changing server event payloads.
- Removing intentionally application-lifetime listeners solely to satisfy a numerical zero-listener assertion; permanent ownership is acceptable when explicit and idempotent.

## Decisions already made

- Every listener has an explicit owner: application/socket instance, connection, authenticated session or feature/component.
- Reconnect and auth-mode transitions may not duplicate listener registration.
- Feature/session subscriptions use standard teardown semantics rather than relying on `socket.off()` globally as cleanup.
- Global `socket.off()` is not used as an indiscriminate substitute for owned teardown if it can remove another owner's handlers.
- Listener cleanup must be verifiable in tests.

## Requirements

1. Search Angular production code for Socket.IO `.on`, service `.on(...)`, `.subscribe()` on realtime observables and realtime-related `window.addEventListener` calls.
2. Classify each listener by lifecycle owner and document/encode that classification in the service API/implementation.
3. Refactor `SessionSyncService` subscriptions to use an explicit destroy scope or application-lifetime ownership that can be tested; do not leave anonymous unmanaged subscriptions.
4. Make feature/component realtime consumers use `takeUntilDestroyed`, async-pipe semantics or explicit unsubscribe according to their lifecycle.
5. For core `RealtimeSocketService` listeners, provide idempotent registration and explicit teardown if the socket instance/service can be replaced/destroyed.
6. Refactor tracked listener bookkeeping so unsubscribe removes exactly the registered handler and reconnect does not append duplicates.
7. Ensure logout/session replacement removes or rebinds any private-session listener whose closure/state belongs to the old session while preserving truly public/application listeners.
8. Ensure the realtime state-machine transition code from `0039` does not call broad `socket.off()` in a way that silently disconnects legitimate observers without updating ownership state.
9. Add tests that subscribe/unsubscribe repeatedly, reconnect multiple times, perform public↔private transitions, logout/login again and assert each emitted event is delivered exactly once to current owners.
10. Add teardown tests proving listener/timer/window-handler counts return to the expected baseline after owner destruction.

## Acceptance criteria

- [ ] Every Socket.IO listener/subscription has an explicit lifecycle owner.
- [ ] Reconnect and public/private transitions do not duplicate handlers.
- [ ] Logout/session replacement cannot leave private-session handlers attached to stale state.
- [ ] Unsubscribing one owner removes only that owner's listener.
- [ ] `SessionSyncService` has deterministic subscription teardown/ownership.
- [ ] Repeated login→logout→login cycles deliver each realtime event once.
- [ ] Listener lifecycle tests and Angular build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Use a Socket.IO test double exposing listener counts and run repeated subscribe/reconnect/logout cycles. Assert counts remain bounded and event callbacks fire exactly once.

## Browser validation

Use Chrome DevTools MCP through `http://localhost:8888` when a local authenticated session is available:

1. Load the application and observe a representative public realtime event once.
2. Authenticate, exercise a private/session event, then reconnect or restart the backend once.
3. Verify the same logical event produces one UI/state reaction after reconnect, not duplicates.
4. Logout and log in again; verify no duplicate session-expired/error/public handlers are visible through repeated toast/state transitions.
5. Inspect console for listener/reconnect warnings without exposing token data.

If representative server events cannot be triggered deterministically, automated listener-count tests are the primary evidence.

## Stop conditions

Mark `BLOCKED` if a listener's required lifetime cannot be determined because its event semantics/ownership are undocumented and removing/rebinding it could drop business events. Report the event name, current registrations and candidate owner rather than guessing.

## Dependencies

- `0009-create-typed-socket-io-event-registry.md`
- `0039-refactor-realtime-connection-into-a-cancellable-state-machine.md`

## Implementation notes

Prefer APIs that naturally bind lifetime, e.g. typed observable event streams plus Angular/RxJS teardown, instead of maintaining a second manual listener registry unless that registry is necessary to own application-level core handlers.

## Execution notes

### Summary

Skipped without implementation because hard prerequisite
`0039-refactor-realtime-connection-into-a-cancellable-state-machine.md`
(`FE-017`) is `SKIPPED_DEPENDENCY`; its prerequisite `SYS-010` is
`BLOCKED`.

### Validation performed

No task branch or worker was created. Direct prerequisite `FE-017` is
`SKIPPED_DEPENDENCY`, with a transitive dependency on blocked
`0010-unify-session-state-protocol.md` (`SYS-010`).

### Browser validation performed

Not applicable; the task was skipped before implementation.

### Changed files

No files changed; only this task metadata was updated.

### Blocker / human decision required

No implementation blocker. The task may be re-enabled only after its hard
dependency chain is deliberately resolved in a new authorized session.