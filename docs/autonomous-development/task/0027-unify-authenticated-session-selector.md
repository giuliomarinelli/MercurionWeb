# 0027 - Unify the authenticated-session selector

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every Angular consumer use one canonical `authenticated` selector whose semantics incorporate the validated session state rather than independently checking initials, storage keys, cookies or tokens.

Source: `FE-005` in Series `0001`.

## Context

Current code has incompatible login predicates. `AuthGuard` accepts any non-empty `localStorage['login']`; `UserContextService.isLoggedIn` checks only initials; `SessionSyncService` requires initials plus the client login marker cookie and then uses the private Socket.IO handshake to strengthen session state. App-shell and route logic also participate in login decisions.

After `0026`, auth state has a single owner. This task defines and enforces the one derived predicate that means the application may treat the user as authenticated.

## Relevant files and modules

- canonical auth store/facade introduced by `0026`
- `MercurionWebNg/src/app/guards/auth.guard.ts`
- `MercurionWebNg/src/app/services/context/user-context.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/app.component.ts`
- header/sidenav/layout consumers of login state
- login/MFA/SSO completion paths
- JWT/session helper code

## In scope

- Define one derived `authenticated` selector and any supporting session-validity selectors.
- Replace independent login predicates in guard, shell and UI consumers.
- Make the selector respect token/session expiry and explicit server invalidation according to the canonical session protocol.
- Preserve public-route behaviour and redirect intent.
- Add tests for contradictory/stale local evidence.

## Out of scope

- Changing route-public/private metadata; later FE tasks own route policy.
- Rewriting persistence internals (`0028`).
- Changing token lifetimes or backend session validation.
- Treating a client-readable cookie as a standalone authentication credential.

## Decisions already made

- There is exactly one semantic definition of `authenticated` on the Angular side.
- A non-empty initials string alone is insufficient.
- A stale access token, WS token, storage key or cookie may not independently authenticate the UI.
- Explicit server/session invalidation wins over local evidence.
- The selector belongs to the canonical auth/session state owner from `0026`.

## Requirements

1. Derive `authenticated` from canonical state, not directly from browser persistence in each consumer.
2. Ensure the selector cannot be true while the store is bootstrapping, anonymous, pre-auth/MFA-only, session-expired or explicitly invalidated.
3. Account for token/session expiry according to the protocol established in `0010`; do not invent a second expiration policy.
4. Refactor `AuthGuard` to consume this selector/store contract rather than `localStorage['login']`.
5. Refactor app-shell and UI visibility logic to use the same selector.
6. Ensure login/MFA/SSO transitions set the underlying canonical state such that the selector becomes true exactly once at successful completion.
7. Ensure logout/session expiry makes it false synchronously at the canonical state boundary even if stale storage/cookie artifacts remain briefly.
8. Add tests for combinations such as initials-only, cookie-only, token-only, expired token/session, pre-auth, authenticated and server-invalidated.

## Acceptance criteria

- [ ] Guard, app shell and session-related UI use the same `authenticated` selector.
- [ ] No production consumer determines authentication by reading `login`, access-token or login-cookie state directly.
- [ ] Stale or partial local state cannot make a protected route accessible.
- [ ] Successful authentication transitions the selector to true and logout/expiry transitions it to false deterministically.
- [ ] Contradictory-state tests cover the former independent predicates.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused guard/store tests covering stale/partial state and route decisions.

## Browser validation

Mandatory through `http://localhost:8888` with Chrome DevTools MCP when a valid local login fixture/account is available:

1. Attempt a protected route while anonymous and verify redirect to `/login` preserves the requested same-origin target.
2. Complete authentication and verify the same protected route becomes reachable.
3. Logout or trigger the available session-invalidated test path and verify protected navigation is denied immediately.
4. Reload after logout and confirm stale UI/session state does not re-authenticate the shell.

If authentication fixtures are unavailable, record the blocker and do not fabricate credentials.

## Stop conditions

Mark `BLOCKED` if `0010` leaves unresolved which server/session evidence is authoritative for the authenticated state. The task must not silently choose a weaker predicate merely to preserve current client behaviour.

## Dependencies

- `0010-unify-session-state-protocol.md`
- `0026-create-canonical-angular-auth-state-store.md`

## Implementation notes

Keep the selector semantic, e.g. `authenticated`, rather than exposing its implementation as `hasCookieAndInitials` or similar. Later persistence/protocol internals must be able to change without modifying guard/UI consumers again.

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