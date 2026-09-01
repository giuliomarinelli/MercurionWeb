# 0036 - Centralize ephemeral authentication errors

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace distributed `lastHttpErr`, `mfaError` and component-local auth error persistence/mapping with one typed ephemeral auth-error state whose lifecycle is explicit and cannot leak stale errors into a later authentication attempt.

Source: `FE-014` in Series `0001`.

## Context

Current login code writes encoded `lastHttpErr` values into both local and session storage, while `AuthRedirectService` writes `mfaError` to session storage. Login/MFA components also contain response-status/message mapping. These error values are not part of durable session identity, but their persistence and clearing rules are mixed with auth flow state.

After `0026`, auth state has one owner; after `0035`, transport errors are classified centrally. This task gives user-facing auth errors a separate short-lived model rather than using arbitrary storage keys as a message bus.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/login/login.page.component.ts`
- `MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts`
- `MercurionWebNg/src/app/services/auth-redirect.service.ts`
- canonical auth store/facade from `0026`
- auth error classifier from `0035`
- auth/session persistence adapter from `0028`
- `HttpErrorBody`, confirmation/error models and auth error-code catalog

## In scope

- Define a typed ephemeral auth-error model/category.
- Centralize conversion from stable application/auth error codes to flow-level error state.
- Remove ad-hoc `lastHttpErr` / `mfaError` storage writes/reads where they are only used to carry transient UI error information.
- Define clear/reset/consume semantics for each new auth attempt and route transition.
- Preserve a minimal one-shot persisted handoff only if navigation genuinely requires it, using the canonical persistence adapter and expiry/consume semantics.
- Add lifecycle and stale-error regression tests.

## Out of scope

- General application-wide error/toast architecture.
- Changing server error codes/messages.
- Persisting diagnostic details indefinitely in browser storage.
- Logging sensitive auth payloads for debugging.

## Decisions already made

- Auth errors are ephemeral state, not durable user/session data.
- A new authentication attempt clears obsolete prior-flow errors.
- Stable server/application error codes drive mapping where available; raw message text is not a durable control-flow key.
- Sensitive/internal server details must not be retained merely to reproduce a UI message.
- Navigation handoff, if required, is one-shot and short-lived.

## Requirements

1. Inventory all producers/consumers of `lastHttpErr`, `mfaError` and equivalent auth-specific error fields/state.
2. Define a discriminated error state with stable categories/codes needed by login/MFA/recovery UI and an optional safe public message.
3. Have `0035`'s classifier/auth flow map transport errors into that state exactly once.
4. Refactor login/MFA/auth redirect components to consume typed error state rather than decode arbitrary stored HTTP bodies.
5. Clear obsolete errors on a new login attempt, successful step transition, successful authentication, logout and explicit cancellation as appropriate.
6. If an error must survive one router navigation, persist only the minimal safe typed payload with one-shot consume semantics; prefer in-memory state otherwise.
7. Ensure unrelated HTTP errors do not populate auth-error state.
8. Add tests proving an error from attempt A cannot appear in attempt B, MFA handoff displays/consumes the intended error once, successful authentication clears errors, and malformed legacy persisted error data fails safely.
9. Remove obsolete storage keys and migration-clean them through the auth persistence adapter.

## Acceptance criteria

- [ ] `lastHttpErr` / `mfaError` are no longer ad-hoc durable message buses in auth production code.
- [ ] Login/MFA error UI consumes one typed ephemeral auth-error state.
- [ ] A new authentication attempt cannot display a stale prior-attempt error.
- [ ] Navigation handoff, if retained, is one-shot and validated.
- [ ] Stable application codes rather than arbitrary message strings drive behaviour where the server provides them.
- [ ] Sensitive/internal details are not unnecessarily persisted.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused auth-error lifecycle tests covering fail → navigate → consume, fail → new attempt, fail → successful retry, MFA transition and malformed legacy state.

## Browser validation

When deterministic invalid-credential/MFA scenarios are available via `http://localhost:8888`:

1. Trigger one expected login error and verify the correct user-facing state.
2. Start a new login attempt and confirm the old error is absent before a new failure occurs.
3. Complete/leave the flow and navigate back; verify consumed errors do not replay.
4. Confirm console/storage do not contain serialized full HTTP error bodies solely for UI handoff.

Automated lifecycle tests may substitute when suitable credentials/scenarios are unavailable.

## Stop conditions

Mark `BLOCKED` if multiple server error codes/messages currently map to materially different product guidance but the intended user-facing distinction is undocumented. Preserve stable codes and request the mapping decision rather than inventing copy/behaviour.

## Dependencies

- `0012-centralize-application-error-code-catalog.md`
- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`
- `0034-type-validate-and-expire-pre-auth-mfa-state.md`
- `0035-unify-auth-error-invalidation-in-one-interceptor-path.md`

## Implementation notes

Keep error state separate from the authenticated-session union where possible: the auth store may expose it, but an error message should not become another authentication truth flag.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / scenario-dependent._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._