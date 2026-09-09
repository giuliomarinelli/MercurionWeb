# 0032 - Scope account-recovery storage cleanup

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

Implemented FE-010 on `feature/FE-010`. Account recovery now delegates to the
canonical `AuthStateStore.beginRecovery()` transition. The store first moves
the state to anonymous, then invokes the existing semantic persistence
operations for authenticated, pre-auth, and ephemeral auth/session data. No
recovery code knows or duplicates browser-storage key names.

### Validation performed

- Initial task-start process probe: no Angular, Nest, Tox21, test watcher, or
  other workspace-consuming task/session process was active. The listed Node
  processes were MCP/CLI infrastructure only.
- `npm ci`: passed on Node 22.16.0/npm 10.9.2 (existing engine/deprecation and
  audit warnings only).
- `npm run ci:check`: passed unchanged at base
  `9d0f0b2f91bddca834d5f42af7a0b42a4931eb85`.
- Focused Angular specs: `npx ng test --watch=false
  --karma-config=karma.conf.js
  --include=src/app/services/recovery.service.spec.ts
  --include=src/app/services/auth-session-persistence.service.spec.ts
  --include=src/app/services/auth-state.store.spec.ts`: 22/22 passed.
- Angular build: `npm run build --workspace mercurion_web_ng`: passed; existing
  bundle/CommonJS budget warnings only.
- Final pre-integration process probe: no task-owned workspace process was
  active before the clean install.
- Final `npm ci`: passed.
- Final `npm run ci:check`: passed completely, including autonomous validation,
  lint, typecheck, all Angular/Nest tests, builds, GraphQL, and static checks.
- Browser-storage search:
  `Get-ChildItem MercurionWebNg\src -Recurse -File | Select-String -Pattern
  'localStorage\.clear\(\)|sessionStorage\.clear\(\)'` found only test
  setup/teardown. No production auth/session blanket clear remains.
- The other auth/session cleanup call sites use the canonical store or
  persistence adapter. No additional production blanket-clear responsibility
  required routing or a later-task note.

### Browser validation performed

Not required by this recipe. Deterministic adapter/store tests cover the
storage contract and canonical recovery transition.

### Changed files

- `MercurionWebNg/src/app/services/recovery.service.ts`
- `MercurionWebNg/src/app/services/recovery.service.spec.ts`
- `MercurionWebNg/src/app/services/auth-state.store.ts`
- `MercurionWebNg/src/app/services/auth-state.store.spec.ts`
- `MercurionWebNg/src/app/services/auth-session-persistence.service.spec.ts`
- `docs/autonomous-development/task/0032-scope-account-recovery-storage-cleanup.md`

### Commits

- `1cfaedc1` — `fix(auth): scope recovery storage cleanup`
- Final task notes/status commit follows this validation.

### Blocker / human decision required

None. Final clean-install CI-parity validation is recorded below before
integration.