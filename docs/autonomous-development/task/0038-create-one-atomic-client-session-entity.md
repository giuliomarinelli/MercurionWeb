# 0038 - Create one atomic client session entity

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make the HTTP access token, WebSocket token, scopes, initials/user identity and client session markers one coherent client-session entity whose creation, refresh, revocation and cleanup are applied atomically through the canonical auth/session owner.

Source: `FE-016` in Series `0001`.

## Context

Today access-token, WS-token/timestamp, scopes, initials and login-cookie markers have independent getters/setters and lifecycles across `AuthService`, `UserContextService`, `SessionSyncService` and browser storage. Earlier FE tasks centralize state ownership, persistence, login activation, logout and error handling, but the underlying authenticated credential set can still be treated as separate mutable pieces.

This task closes that gap by defining the coherent client-side session snapshot/identity that those earlier abstractions manage.

## Relevant files and modules

- canonical auth store/facade from `0026`
- auth/session persistence adapter from `0028`
- login/session activation path from `0029`
- logout implementation from `0031`
- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- JWT helper and auth models
- server session protocol from `0010`

## In scope

- Define a typed authenticated client-session entity/snapshot with explicit invariants.
- Centralize install/rotate/revoke/clear operations for all session-derived credentials/state.
- Make HTTP token rotation and WS token refresh update the correct part of one session without creating impossible partial states.
- Associate scopes/initials/session identity with the active session and prevent cross-session leakage.
- Add invariant and concurrency/order tests.

## Out of scope

- Storing raw server-side session internals that are not intentionally exposed to the browser.
- Changing JWT/session issuance, cryptography or token lifetimes.
- Socket reconnect/backoff implementation (`0039`).
- General user profile/account cache.
- Treating a client-readable login marker cookie as secret/authoritative session data.

## Decisions already made

- Authenticated client state is one semantic session entity, not an arbitrary bag of independent storage keys.
- Installing a new authenticated session invalidates/clears state owned by any prior session before exposing the new one.
- Scopes and initials belong to the active session identity and cannot survive its revocation.
- HTTP and WS tokens may rotate independently according to server protocol, but their updates occur through one session owner with session-consistency checks.
- Explicit server invalidation/logout atomically makes all authenticated selectors false before stale derived data can be consumed.

## Requirements

1. Define the minimal client-session entity using only server/client fields that are required by current behaviour. Include stable association/identity information available from token claims or protocol where needed to prevent cross-session updates.
2. Encode invariants: an authenticated entity cannot exist without the required HTTP/session evidence; scopes/initials cannot exist as authenticated data for a different/absent session; a WS token must be associated with the same active session/user according to `0010`.
3. Replace public low-level setters such as independent token/scope/initial setters with semantic session operations where possible: install session, rotate HTTP token, rotate WS token, revoke/clear session.
4. On login completion, construct/validate the full new session before exposing `authenticated=true`.
5. On `X-New-Access-Token`, update the active session and re-derive claims/scopes atomically; reject/handle a rotation that cannot be associated safely with the current session.
6. On WS-token refresh, update only the active session's WS credential and timestamp/metadata; a late refresh from a previous session must not overwrite a newer session.
7. On logout/session expiry, clear the complete entity and persisted derived state through one operation.
8. Ensure cross-tab synchronization transports/reloads semantic session changes without copying an internally inconsistent subset.
9. Add tests for login install, HTTP rotation, WS rotation, logout, server invalidation, user/session replacement, late async token refresh and malformed/expired persisted session bootstrap.
10. Remove obsolete independent credential state APIs once all consumers use the entity/semantic operations.

## Acceptance criteria

- [ ] One typed client-session entity represents authenticated Angular session state.
- [ ] Login exposes authenticated state only after the entity satisfies all required invariants.
- [ ] HTTP/WS token rotation cannot mix credentials from different sessions/users.
- [ ] Scopes and initials are cleared/re-derived with the active session and cannot leak across login/logout.
- [ ] Late async refresh results cannot overwrite a newer/revoked session.
- [ ] Logout/expiry clears the entity atomically from the application's perspective.
- [ ] Persistence/bootstrap tests reject inconsistent partial sessions safely.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused session-invariant tests with deliberately reordered async login/refresh/logout operations and two different synthetic session/user identifiers.

## Browser validation

Mandatory when local credentials are available, using Chrome DevTools MCP through `http://localhost:8888`:

1. Authenticate and inspect the canonical store/session state via normal observable UI/network effects; verify protected UI and private socket activate together rather than in visibly inconsistent stages.
2. Allow/trigger a token refresh and verify the session remains stable while credentials rotate.
3. Logout and confirm HTTP/WS protected traffic stops and owned persisted session data is removed.
4. Reload after logout and verify no partial persisted entity resurrects authentication.

Do not expose actual tokens in reports/screenshots/logs.

## Stop conditions

Mark `BLOCKED` if `0010` does not provide enough stable identity/session association to determine whether a refreshed WS/HTTP token belongs to the current session. Do not accept late credentials purely because they are syntactically valid JWTs.

## Dependencies

- `0010-unify-session-state-protocol.md`
- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`
- `0029-preserve-authorization-scopes-through-every-login-flow.md`
- `0030-complete-cross-tab-authentication-synchronization.md`
- `0031-make-logout-a-deterministic-session-transition.md`
- `0035-unify-auth-error-invalidation-in-one-interceptor-path.md`

## Implementation notes

Keep this a domain model/facade invariant, not necessarily one serialized blob. Persistence may store separate keys for security/lifecycle reasons, provided the adapter loads/commits them as one coherent session transaction and the application never observes an invalid partial state.

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