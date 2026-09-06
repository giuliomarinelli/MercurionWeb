# 0010 - Unify session state protocol

- [x] DONE
- [ ] BLOCKED
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

Implemented and validated on `feature/SYS-010`. The prior runtime blocker was
an unavailable local Tox21 entry point; the approved local entry point was
subsequently restored and the complete browser flow was exercised through the
nginx development edge.

### Validation performed

The unchanged task-start preflight and final root CI-parity gate both passed:

```text
npm ci
npm run ci:check
```

The feature branch also passed rest/socket-contract builds, Angular and Nest
typechecks/builds, Nest tests (125 suites / 208 tests), and Angular tests
(301 successful). `docs/architecture/rest-route-ownership.json` was
regenerated through its repository-owned checker before the final green gate.

### Browser validation performed

With the canonical local runtime behind `http://localhost:8888`, browser
validation covered public load, manual test-account authentication, reload
restore to the authenticated dashboard, logout, and Socket.IO reconnection.
For the reconnect check, the task-owned Nest process was stopped long enough
to force the client disconnect/reconnect cycle and then restarted; the browser
remained on the authenticated dashboard and did not enter a login loop.
No production credentials or data were used.

### Changed files

The task implementation remains on `feature/SYS-010` until feature-SHA CI and
post-merge CI have both succeeded.

### Integration status

This `DONE` marker is provisional until the task's exact feature SHA and the
subsequent no-fast-forward merge SHA both pass the required GitHub Actions
gate. The former dependency-closure metadata was reverted on this branch so
the now-unblocked descendants return to the planner's normal pending state.
