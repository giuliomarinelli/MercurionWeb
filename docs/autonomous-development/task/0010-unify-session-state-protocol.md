# 0010 - Unify session state protocol

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Define and implement one documented, typed session protocol shared by Angular and Nest so REST, cookie and Socket.IO paths expose the same session states, transitions, expiration causes and reconnection semantics.

Source: `SYS-010` in Series `0001`.

## Context

Session state is currently represented through several mechanisms: Angular auth/session services, a signed session identifier DTO, HTTP cookies/tokens, `SessionSyncService`, `RealtimeSocketService`, Nest `SessionService`, authentication controllers and Socket.IO session initialization. The baseline therefore has multiple local conventions for deciding what a session means and how it transitions.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNg/src/app/Models/auth/login.models.ts`
- `MercurionWebNode/src/app_modules/auth/services/session.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/authentication.service.ts`
- `MercurionWebNode/src/app_modules/auth/controllers/authentication.controller.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- shared contract mechanism established by earlier contract tasks

## In scope

- Inventory current session states and transition triggers across HTTP/cookie/socket paths.
- Define one canonical session state machine/protocol and typed transition/cause vocabulary.
- Align Angular and Nest handling to the canonical protocol.
- Define initial connection, authentication, refresh, expiration/revocation, reconnect, logout and invalid-session behaviour.
- Add tests proving equivalent state semantics across the supported transports.

## Out of scope

- Replacing the authentication provider or token cryptography.
- UI redesign of login/MFA/settings.
- General Socket.IO event catalog work outside the session protocol; task `0009` owns event registry infrastructure.

## Decisions already made

- Session semantics must be identical from the perspective of both sides even when transport mechanics differ.
- The protocol must explicitly represent causes of expiry/revocation and reconnection behaviour rather than relying on message strings.
- Current security boundaries and server authority over session validity are preserved.

## Requirements

1. Document current REST/cookie/socket session inputs and outputs before changing them.
2. Define a finite canonical set of session states and allowed transitions.
3. Define typed causes for expiration, revocation, invalid signature/credentials and reconnect requirements.
4. Define how a browser begins public, becomes authenticated/private, refreshes credentials, loses validity and reconnects.
5. Make Angular session/auth/socket consumers derive behaviour from the canonical protocol rather than independent booleans/message strings where feasible.
6. Make Nest HTTP and WebSocket session handling emit/use the same canonical state/cause vocabulary.
7. Add transition tests including valid refresh, expired session, revoked session, socket reconnect and logout.
8. Document the protocol near the canonical contract source.

## Acceptance criteria

- [ ] One typed session protocol/state machine is the source of truth for both Angular and Nest.
- [ ] REST/cookie/socket behaviour maps unambiguously onto the same states/transitions.
- [ ] Expiration/revocation causes are explicit and typed.
- [ ] Reconnect semantics are documented and covered by tests.
- [ ] Angular no longer needs independent contradictory rules to infer the same session transition.
- [ ] Nest and Angular builds/tests pass.
- [ ] Existing security behaviour not targeted by this task remains compatible.

## Validation

From both `MercurionWebNode` and `MercurionWebNg`, run builds and relevant auth/session/socket tests.

```text
npm run build
npm test -- --runInBand
```

Use the Angular equivalent `npm test -- --watch=false` where appropriate.

## Browser validation

Using the canonical local runtime at `http://localhost:8888` and Chrome DevTools MCP, validate any session flows for which development/test credentials are intentionally available: initial public load, authenticated transition, refresh/reconnect, and logout. Inspect `/api/` and `/socket.io/` traffic and verify no cross-origin bypass is introduced.

Never use production credentials/data. If the required development identity state is unavailable, record that runtime validation as blocked rather than fabricating it.

## Stop conditions

Block before implementation if the canonical session states or product-visible expiration/reconnection behaviour require a product/security decision not specified by existing code/documentation. Produce the current-state inventory and list the conflicting behaviours/decision points.

## Dependencies

- `0009-create-typed-socket-io-event-registry.md` should be `DONE` first so session Socket.IO messages can use the canonical event contract.

## Implementation notes

Prefer a small explicit state machine over distributed booleans. Do not conflate transport connectivity with authenticated session validity; represent them as separate concepts if the current behaviour requires both dimensions.

## Execution notes

### Summary

Implemented the shared typed session protocol and its REST/Socket.IO mappings,
but the mandatory browser-validation runtime cannot be started safely. The
canonical Tox21 command fails before it can serve the required stack, so this
feature branch is preserved as `BLOCKED`.

### Validation performed

Unchanged task-start preflight passed on `feature/SYS-010` at
`313f443bd1335ba01ac5cf93e2de93489c92a00c`:

```text
npm ci
npm run ci:check
```

Task-specific validation passed:

```text
npm run build --workspace @mercurion/rest-contracts
npm run build --workspace @mercurion/socket-contracts
npm run typecheck --workspace mercurion_web_ng
npm run typecheck --workspace mercurion_web_node
npm run build --workspace mercurion_web_ng
npm run build --workspace mercurion_web_node
npm test --workspace mercurion_web_node -- --runInBand
```

Nest unit tests: 125 suites / 208 tests passed. Angular tests reported
`TOTAL: 301 SUCCESS`; the Angular CLI left its completed Karma process alive,
so the task-owned process tree was stopped by explicit PID before runtime and
before the final clean-install gate. The final root `npm ci` passed. Its first
`npm run ci:check` exposed an updated documentation reference in the
repository-owned REST route inventory; after reviewing and regenerating
`docs/architecture/rest-route-ownership.json` with
`node scripts/check-rest-route-ownership.mjs --write`, the second final
`npm run ci:check` passed completely.

### Browser validation performed

The externally managed nginx edge was reachable but returned `502 Bad Gateway`
for both `http://localhost:8888/health` and `http://localhost:8888/` before
the task-owned application processes started. The worker then followed the
canonical start order. Tox21 failed immediately:

```text
../MercurionTox21/.venv/Scripts/python.exe -m main
No module named main
```

Nest and Angular watch processes that had been started after that failure were
stopped by their recorded PIDs. No browser was opened, no credentials were
used, and no session-flow evidence was fabricated. Chrome DevTools MCP opened
only `http://localhost:8888/`; its accessibility snapshot was nginx's
`"An error occurred."` / `"currently unavailable"` 502 page, confirming that
the declared public/session flows were unavailable through the required edge.

### Changed files

`packages/rest-contracts/src/session-protocol.ts` and
`packages/rest-contracts/SESSION-PROTOCOL.md` define the documented canonical
state machine, transition/cause vocabulary, HTTP error mapping, and transport
inventory. Angular derives a `sessionProtocol` signal from that contract;
Nest Socket.IO acknowledgements and invalidation notifications use its typed
states/causes. Contract tests cover refresh, expiry, revocation, reconnect,
logout, socket acknowledgements, and HTTP error mapping.

### Blocker / human decision required

Restore or document the approved canonical non-production Tox21 entry point so
`../MercurionTox21/.venv/Scripts/python.exe -m main` starts successfully. Then
a new human-authorized task attempt must validate public load, authenticated
transition, refresh/reconnect, logout, `/api/`, and `/socket.io/` through the
nginx edge with Chrome DevTools MCP.
