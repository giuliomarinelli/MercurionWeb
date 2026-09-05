# 0032 - Scope account-recovery storage cleanup

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Stop account recovery from clearing all browser storage. Recovery must remove only Mercurion auth/session keys it owns, preserving unrelated preferences and application/browser data.

Source: `FE-010` in Series `0001`.

## Context

`MercurionWebNg/src/app/services/recovery.service.ts` currently contains `clearBrowserCache()` implemented as `localStorage.clear()` and `sessionStorage.clear()`. This makes a security-sensitive recovery flow destroy unrelated state, including preferences and any future independently owned cache/config data.

Task `0028` creates targeted auth/session persistence cleanup operations. This task makes account recovery use those operations and defines exactly what recovery is allowed to invalidate.

## Relevant files and modules

- `MercurionWebNg/src/app/services/recovery.service.ts`
- account-recovery/password-recovery pages and tests
- auth/session persistence adapter from `0028`
- canonical auth store from `0026`
- theme/preferences/storage consumers that must survive recovery

## In scope

- Replace blanket `localStorage.clear()` / `sessionStorage.clear()` with targeted cleanup.
- Define which Mercurion auth/session/pre-auth keys recovery must invalidate.
- Preserve unrelated keys/preferences.
- Add tests proving both cleanup and preservation.
- Ensure recovery transitions the canonical auth store to a safe anonymous/recovery state.

## Out of scope

- The later application-wide storage registry/migration task (`FE-032`).
- Changing server recovery-token semantics.
- Preserving stale authenticated credentials after recovery.
- Clearing browser data belonging to other origins/applications, which the frontend cannot and should not attempt.

## Decisions already made

- `localStorage.clear()` and `sessionStorage.clear()` are forbidden in this flow.
- Recovery may clear only explicitly owned Mercurion auth/session keys required by the security protocol.
- Theme and unrelated preferences/data survive recovery unless a concrete security reason and explicit ownership rule says otherwise.
- Cleanup must go through the canonical persistence/store boundary rather than duplicate key lists in `RecoveryService`.

## Requirements

1. Trace every point where account recovery invokes `clearBrowserCache()` and establish which auth/session state must be invalidated at that step.
2. Replace blanket clearing with targeted adapter operations from `0028`.
3. Include stale HTTP/WS credentials, scopes, login markers, refresh locks and transitional auth data only when their lifecycle requires invalidation.
4. Preserve unrelated preferences such as theme and non-auth application state.
5. Ensure malformed/stale auth persistence cannot survive by exploiting a key not covered by the canonical auth adapter.
6. Make recovery update the canonical auth state before/with persistence cleanup so UI/guard state cannot remain authenticated.
7. Add tests seeding both owned auth keys and unrelated keys into local/session storage, executing cleanup, then asserting only the owned set was removed.
8. Search the repository for any other blanket browser-storage clear used for auth/session cleanup and either route it through the adapter if it is the same responsibility or document it for its dedicated later task.

## Acceptance criteria

- [ ] Account recovery no longer calls `localStorage.clear()` or `sessionStorage.clear()`.
- [ ] All auth/session state that must be invalidated by recovery is removed through the canonical adapter/store.
- [ ] Unrelated preferences and test sentinel keys remain unchanged.
- [ ] Recovery leaves the canonical auth state non-authenticated.
- [ ] Tests cover localStorage and sessionStorage preservation/cleanup.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused `RecoveryService`/persistence tests with sentinel non-auth keys. Search the final recovery flow for `.clear()` calls on browser storage.

## Browser validation

Optional but useful if a deterministic recovery fixture exists. Through `http://localhost:8888`:

1. Set a normal user preference such as theme.
2. Exercise the recovery transition far enough to trigger local cleanup.
3. Verify auth/session state is removed while the unrelated preference remains.

Do not block task completion solely because an external email/recovery code is unavailable if the cleanup contract is fully covered by deterministic tests.

## Stop conditions

Mark `BLOCKED` if account recovery is documented to require destruction of a non-auth domain's persisted data for a security reason but ownership/required scope is not specified. Request the exact additional key/domain rather than reverting to blanket clearing.

## Dependencies

- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`

## Implementation notes

This task should be small after `0028`: recovery should call semantic operations such as `clearAuthenticatedSession()` / `clearPreAuthState()` rather than know storage key names.

## Execution notes

### Summary

Skipped without implementation because hard prerequisites
`0026-create-canonical-angular-auth-state-store.md` (`FE-004`) is `BLOCKED`
and `0028-encapsulate-auth-session-browser-persistence.md` (`FE-006`) is
`SKIPPED_DEPENDENCY`.

### Validation performed

No task branch or worker was created. Direct prerequisites: `FE-004` is
`BLOCKED`; `FE-006` is `SKIPPED_DEPENDENCY`. Transitive dependency chain:
`FE-010` -> `FE-004` (`BLOCKED`) and `FE-006` (`SKIPPED_DEPENDENCY`) ->
`FE-004` (`BLOCKED`).

### Browser validation performed

Not applicable; the task was skipped before implementation.

### Changed files

No files changed; only this task metadata was updated.

### Blocker / human decision required

No implementation blocker. The task may be re-enabled only after its hard
dependency chain is deliberately resolved in a new authorized session.