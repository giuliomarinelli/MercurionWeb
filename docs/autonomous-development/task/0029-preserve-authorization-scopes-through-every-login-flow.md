# 0029 - Preserve authorization scopes through every login flow

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Fix the login flow so valid authorization scopes survive successful authentication consistently, including direct login and MFA completion, and cannot be erased by cleanup intended only for a previous session.

Source: `FE-007` in Series `0001`.

## Context

`AuthService.login_firstStep()` currently extracts `scp` from a returned access token and writes the scope cache, then immediately calls `UserContextService.logout()`. That logout removes `scp` together with old login/token state. MFA completion follows a different path and also writes scopes. The result is ordering-dependent auth state and different semantics between login variants.

Earlier tasks centralize auth state and persistence; this task makes scope lifecycle an explicit part of successful session establishment rather than a side effect of call ordering.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- canonical auth store from `0026`
- auth/session persistence adapter from `0028`
- `MercurionWebNg/src/app/services/context/user-context.service.ts` if still present as a compatibility adapter
- `MercurionWebNg/src/app/pages/login/login.page.component.ts`
- `MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts`
- SSO completion flow
- JWT/scope helpers and authorization consumers

## In scope

- Correct scope establishment/cleanup ordering for every successful login variant.
- Make old-session cleanup distinct from new-session activation.
- Ensure scopes are derived from the accepted access token through one path.
- Add regression tests for direct login, MFA login and other login completion paths that issue an access token.
- Ensure logout/session invalidation still clears scopes.

## Out of scope

- Redefining scope names/permissions on the server.
- Caching authorization beyond the lifetime of the authenticated session.
- Replacing server-side authorization with client scope checks.
- General token/session-entity consolidation beyond what is required here; `0038` completes that work.

## Decisions already made

- Scope cache is derived data from the currently accepted access token/session.
- Successful login must never call a cleanup operation that erases newly established session state.
- All login variants converge through one session-activation path where practical.
- Logout, explicit invalidation and session replacement clear prior scopes before the new session is activated.

## Requirements

1. Trace direct password/no-MFA, password+MFA, SSO and any other current login completion path that installs an access token.
2. Replace the current `setCachedScopes(...)` followed by `userContext.logout()` ordering with an explicit previous-session cleanup then new-session activation sequence.
3. Establish scopes exactly once from the final accepted access token through the canonical auth/session owner.
4. Ensure an empty/missing `scp` claim produces the intended empty authorization state rather than leaving scopes from a previous user.
5. Ensure failed/pre-auth login steps never install final-session scopes.
6. Ensure logout/session-expired/session-replaced paths remove scopes atomically with other credentials.
7. Add tests for direct login with scopes, direct login without scopes, MFA completion with scopes, transition between two users/sessions and logout.
8. Search for any remaining manual scope writes that can bypass canonical session activation.

## Acceptance criteria

- [ ] A successful direct login retains the scopes encoded in its final access token.
- [ ] A successful MFA login yields the same scope semantics.
- [ ] Missing/empty scopes cannot inherit values from a previous session.
- [ ] Failed/pre-auth states do not expose authenticated scopes.
- [ ] Logout/session invalidation clears scopes.
- [ ] There is one canonical scope-establishment path for completed authentication.
- [ ] Regression tests demonstrate the former `login_firstStep` ordering bug cannot recur.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused auth/session tests for direct and MFA login variants and inspect the final canonical store/persistence state after each transition.

## Browser validation

When deterministic local credentials are available, use Chrome DevTools MCP through `http://localhost:8888`:

1. Complete a login path that returns scopes.
2. Confirm protected UI/actions that depend on those scopes remain available after login/navigation/reload according to the intended session persistence.
3. Logout and confirm scope-dependent UI is no longer authorized.
4. If both no-MFA and MFA test users exist, verify both converge to the same post-login state.

If suitable credentials are unavailable, browser validation may be recorded as blocked while unit/integration regression tests remain mandatory.

## Stop conditions

Mark `BLOCKED` if client scope consumers rely on undocumented behaviour that conflicts with the access-token `scp` claim or if the authoritative server scope format is ambiguous. Do not invent permission semantics client-side.

## Dependencies

- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`

## Implementation notes

Prefer an operation such as `activateAuthenticatedSession(result)` owned by the canonical auth boundary, with old-state cleanup performed before installing the new token/scopes/initials. Avoid exposing low-level `setCachedScopes` as a normal component-flow operation once the refactor is complete.

## Execution notes

### Summary

Skipped without implementation because hard prerequisites `0026-create-canonical-angular-auth-state-store.md` (`FE-004`) is terminal `BLOCKED` and `0028-encapsulate-auth-session-browser-persistence.md` (`FE-006`) is terminal `SKIPPED_DEPENDENCY`. The canonical auth owner and persistence adapter are not available on `develop`.

### Validation performed

- No task branch or worker was created.
- Direct prerequisites: `FE-004` is `BLOCKED`; `FE-006` is `SKIPPED_DEPENDENCY`.
- Transitive dependency chain: `FE-007` -> `FE-004` (`BLOCKED`) and `FE-006` (`SKIPPED_DEPENDENCY`) -> `FE-004` (`BLOCKED`).

### Browser validation performed

Not applicable; the task was skipped before implementation.

### Changed files

No files changed; only this task metadata was updated.

### Blocker / human decision required

No implementation blocker. The task may be re-enabled only after its hard
dependency chain is deliberately resolved in a new authorized session.