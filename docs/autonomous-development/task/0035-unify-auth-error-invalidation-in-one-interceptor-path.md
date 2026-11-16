# 0035 - Unify auth-error invalidation in one interceptor path

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove overlapping auth invalidation behaviour from `AuthInterceptor` and `AuthFallbackInterceptor`. HTTP/GraphQL auth failures must be classified once and translated into one canonical auth-store event, with navigation/toast policy handled once downstream.

Source: `FE-013` in Series `0001`.

## Context

Both current interceptors react to authentication failures. `AuthInterceptor` handles fatal unauthenticated 401 responses by clearing initials. `AuthFallbackInterceptor` separately handles GraphQL-200 fatal bodies, 401 fatal bodies, 403 missing-permission errors, triggers a toast, calls full `UserContextService.logout()` and navigates to `/login` or `/403-forbidden`. Depending on interceptor ordering and response shape, one response can therefore produce overlapping state mutation/navigation.

SYS error tasks establish stable application-error classification. The Angular auth store established in `0026` must become the single recipient of auth invalidation.

## Relevant files and modules

- `MercurionWebNg/src/app/interceptors/auth.interceptor.ts`
- `MercurionWebNg/src/app/interceptors/auth-fallback.interceptor.ts`
- `MercurionWebNg/src/app/interceptors/fatal-unauthenticated.util.ts`
- interceptor registration in `MercurionWebNg/src/app/app.config.ts`
- canonical auth store from `0026`
- auth/session error catalog/contracts from `0011` / `0012`
- `HttpErrorBody` and GraphQL error response handling
- route/toast/session-expiry consumers

## In scope

- Consolidate request token attachment/refresh-token-header handling and auth-failure classification into clear, non-overlapping interceptor responsibilities.
- Ensure one response causes at most one auth invalidation event.
- Route stable forbidden/missing-permission handling through a deterministic navigation/error policy without duplicating logout semantics.
- Support REST error responses and GraphQL error envelopes according to the canonical error contracts.
- Add interceptor-order/idempotency tests.

## Out of scope

- Redesigning the server error envelope (`0011`) or error-code catalog (`0012`).
- General UI error presentation for non-auth errors.
- Reimplementing logout itself (`0031`).
- Route-policy manifest refactor.

## Decisions already made

- Auth/session invalidation is a canonical store event, not direct storage/UI mutation inside multiple interceptors.
- A single server response must not trigger duplicate logout, duplicate session-expired toast or duplicate navigation.
- Stable application error codes are preferred over message-string parsing once `0011`/`0012` provide them.
- Authorization denial (`FORBIDDEN`) and authentication/session invalidation are distinct events and must not be conflated.
- Token attachment and accepted token rotation may remain interceptor concerns, but installing a rotated token must use the canonical session owner.

## Requirements

1. Map the current interceptor chain/order and every auth-related branch in both interceptors.
2. Define one classifier from HTTP/GraphQL response/error to typed auth events such as token-rotated, session-invalidated/fatal-unauthenticated, forbidden/missing-permission, or unrelated.
3. Refactor to one owner for each responsibility. Remove duplicated fatal-unauthenticated handling.
4. Dispatch session invalidation exactly once to the canonical auth store/session coordinator; do not call low-level `clearInitials()`/`logout()` independently.
5. Route `Forbidden::missing permissions` or its stable catalog code to the existing forbidden UX without clearing a still-valid session.
6. Preserve `X-New-Access-Token` handling but install/derive scopes through the canonical session path rather than direct low-level writes.
7. Support GraphQL responses that return HTTP 200 with typed errors where the current server contract uses that form.
8. Add tests proving one 401/fatal response produces one invalidation, one GraphQL fatal response produces one invalidation, 403 permission denial does not log out, token rotation updates the active session once, and ordinary errors pass through.
9. Test interceptor ordering explicitly so future provider-registration changes cannot restore double handling.

## Acceptance criteria

- [x] No auth failure is independently handled by two interceptors.
- [x] A fatal/session-invalidating response emits exactly one canonical store event.
- [x] Forbidden/permission denial preserves valid authentication and follows the forbidden UX.
- [x] Token rotation updates canonical token/scope state exactly once.
- [x] No interceptor directly performs duplicate storage cleanup + navigation + toast for the same failure.
- [x] REST and GraphQL representative auth errors are covered by tests.
- [x] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused interceptor tests with a counting/mock auth store and router/toast spies to assert one event/side effect per response.

## Browser validation

Use Chrome DevTools MCP through `http://localhost:8888` when a deterministic expired/invalid-session scenario is available:

1. Start authenticated.
2. Trigger one server-side fatal/session-invalidating response.
3. Verify the client transitions once to the expected anonymous/expired state.
4. Confirm the Network panel shows one failing request while console/UI do not exhibit duplicate redirect/toast/logout effects.
5. Verify an accessible route producing a permission-only 403 goes to the forbidden UX without destroying the session, if a fixture exists.

Automated tests are sufficient where generating those server states is not safely available locally.

## Stop conditions

Mark `BLOCKED` if `0011`/`0012` leave multiple indistinguishable server payloads where the client cannot tell permission denial from session invalidation without message-string guessing. Report the concrete server responses needing clarification/fix.

## Dependencies

- `0011-unify-cross-transport-error-envelope.md`
- `0012-centralize-application-error-code-catalog.md`
- `0026-create-canonical-angular-auth-state-store.md`
- `0029-preserve-authorization-scopes-through-every-login-flow.md`
- `0031-make-logout-a-deterministic-session-transition.md`

## Implementation notes

A single interceptor is not mandatory if two narrowly scoped interceptors are clearer; **overlapping classification/side effects are forbidden**. The Definition of Done is one classification/event path, not a specific class count.

## Execution notes

### Summary

Implemented one shared auth-response classifier. `AuthInterceptor` now owns
token attachment, accepted access-token rotation, and session invalidation for
REST 401 and GraphQL-200 fatal envelopes. `AuthFallbackInterceptor` is limited
to permission-denial navigation, so it cannot duplicate invalidation, logout,
toast, or login navigation. The active dependency tasks were already DONE on
this branch; the old skipped note was stale.

### Validation performed

- Confirmed branch `feature/FE-013` was clean at base
  `cf9065e06e1d17974f79f3c3b70a0047ace4235e`.
- Confirmed no Angular/Nest/Tox21/test watcher process was active before the
  unchanged preflight.
- `npm ci` passed.
- `npm run ci:check` passed unchanged before edits.
- `npm run test:ci --workspace mercurion_web_ng` passed: 334 tests.
- `npm run build --workspace mercurion_web_ng` passed; only existing bundle and
  CommonJS warnings were reported.
- Focused interceptor coverage is included in the complete Angular suite:
  REST fatal 401, GraphQL-200 fatal response, permission-only 403, token
  rotation, ordinary errors, and single-side-effect assertions.
- Final runtime processes were stopped/absent before the final clean install.
- Final `npm ci` and `npm run ci:check` passed after implementation.

### Browser validation performed

Not run. No deterministic local expired-session or permission fixture was
available, and the task explicitly permits automated coverage in that case.
The canonical `http://localhost:8888` runtime was not started.

### Changed files

- `MercurionWebNg/src/app/interceptors/auth-error.util.ts`
- `MercurionWebNg/src/app/interceptors/auth.interceptor.ts`
- `MercurionWebNg/src/app/interceptors/auth-fallback.interceptor.ts`
- `MercurionWebNg/src/app/interceptors/auth.interceptor.spec.ts`
- `MercurionWebNg/src/app/interceptors/auth-fallback.interceptor.spec.ts`
- This task execution record.

### Commits

Implementation and task record committed with `git commit --no-gpg-sign` and
the required Copilot co-author trailer:

The final SHA is recorded in the worker result and branch history.