# 0026 - Create the canonical Angular auth state store

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace distributed Angular authentication state with one canonical auth store/facade backed by an explicit state machine. Components, guards, session sync and transport adapters must consume derived state and issue commands instead of mutating auth persistence independently.

Source: `FE-004` in Series `0001`.

## Context

Authentication state is currently split across `AuthService`, `UserContextService`, `SessionSyncService`, `AuthGuard`, interceptors, components, cookies, `localStorage` and `sessionStorage`. `UserContextService.isLoggedIn` is derived only from saved initials, while `SessionSyncService` separately combines initials with a client-readable login cookie and Socket.IO handshake state. `AuthGuard` independently checks the `login` storage key.

The first SYS batch defines transport/session contracts. This task establishes the Angular application owner of that state without redesigning the server protocol.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/context/user-context.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/guards/auth.guard.ts`
- `MercurionWebNg/src/app/interceptors/auth.interceptor.ts`
- `MercurionWebNg/src/app/interceptors/auth-fallback.interceptor.ts`
- login/MFA/SSO/logout components and services
- `MercurionWebNg/src/app/app.component.ts`
- auth/session models under `MercurionWebNg/src/app/Models/auth/`

## In scope

- Introduce one auth/session store or facade using the repository's existing Angular primitives, preferably signals/computed state rather than a new state-management dependency.
- Model meaningful auth states/transitions explicitly.
- Make auth-related consumers read selectors/computed state from the canonical owner.
- Route commands such as bootstrap, login progress/completion, session expiry and logout through the canonical owner.
- Preserve the existing server/token/cookie/Socket.IO contracts while state ownership is centralized.
- Add deterministic state-transition tests.

## Out of scope

- Final persistence implementation (`0028`) beyond the minimum adapter seam needed by this store.
- Reworking redirect state (`0033`) or pre-auth persistence (`0034`) beyond connecting them to commands.
- Redesigning Socket.IO retry mechanics (`0039`).
- Changing server authentication rules, JWT claims or cookie security attributes.
- Introducing NgRx, Redux or another broad state framework solely for auth.

## Decisions already made

- Angular has exactly one authoritative auth-state owner.
- UI/components/guards do not directly write auth persistence.
- Auth state is explicit and exhaustively representable rather than inferred independently by each consumer.
- Existing Angular signals are sufficient unless a concrete repository constraint proves otherwise.
- Server/session truth still comes from validated transport state; the client store is not allowed to make a stale local value authoritative over server invalidation.

## Requirements

1. Inventory all current auth-state sources and writers: initials, HTTP access token, WS token, scopes, client login marker cookie, pre-auth state and `SessionSyncStatus`.
2. Define an explicit state model able to represent at least bootstrap/unknown, anonymous, authentication-in-progress/pre-auth, authenticated, session-expired/invalidated and any transient state required for logout/refresh without ambiguous boolean combinations.
3. Centralize state transitions behind store/facade commands; external consumers may not directly set internal signals.
4. Convert `UserContextService` into a thin compatibility adapter or remove it once consumers use the canonical store; do not leave two authorities.
5. Make `SessionSyncService`, guard/interceptor/app-shell consumers publish events/commands to or consume state from the canonical store rather than maintaining competing login truth.
6. Expose derived selectors for consumer needs instead of leaking storage/cookie details.
7. Make illegal transitions detectable in tests and ensure session-expired/server-invalidated events cannot leave the store authenticated.
8. Add tests for bootstrap with/without persisted session markers, login completion, MFA/pre-auth entry, server invalidation, voluntary logout and cross-tab-originated state changes at the store boundary.
9. Keep implementation compatible with subsequent persistence/session-entity tasks so those can replace internals without changing consumers again.

## Acceptance criteria

- [ ] One Angular service/store is the authoritative owner of auth state.
- [ ] `AuthGuard`, app shell, interceptors and session sync no longer determine login using independent ad-hoc criteria.
- [ ] Components do not directly mutate auth/session persistence as a way of changing auth state.
- [ ] Auth states and transitions are explicit and exhaustively tested.
- [ ] Server/session invalidation always converges to a non-authenticated client state.
- [ ] Existing login, MFA, SSO, refresh and logout flows still compile and have targeted tests.
- [ ] No second store/facade remains authoritative for initials/login truth.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused auth-store/state-machine tests that cover every declared transition and invalid/stale event ordering.

## Browser validation

Mandatory through the canonical local runtime and Chrome DevTools MCP at `http://localhost:8888`:

1. Start from an anonymous page load and confirm the shell settles to anonymous state without loops/errors.
2. Complete one available login path and verify protected navigation becomes available only after the canonical store reaches authenticated state.
3. Logout and verify the UI/route/socket-facing state converges to anonymous without stale initials or protected content.
4. Inspect console/network for duplicate navigation or duplicate auth-invalidating side effects introduced by the refactor.

If a deterministic login test account/credential is unavailable, mark browser-auth validation `BLOCKED` rather than inventing credentials; unit/integration validation may still be recorded.

## Stop conditions

Mark `BLOCKED` if the server/session protocol required to decide a state transition is ambiguous after reading `0010` and current Nest behaviour. Do not let local initials or storage keys substitute for an undefined server truth rule.

## Dependencies

- `0010-unify-session-state-protocol.md`
- `0012-centralize-application-error-code-catalog.md` should be available for stable invalidation reasons where applicable.
- `0025-centralize-angular-runtime-build-config.md`

## Implementation notes

Favor a small discriminated union plus signals/computed selectors. The store may orchestrate adapters, but persistence, HTTP transport and Socket.IO should remain separable collaborators rather than being reimplemented inside one god service.

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