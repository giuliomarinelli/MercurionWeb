# 0028 - Encapsulate auth and session browser persistence

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Move every Angular auth/session read and write of `localStorage`, `sessionStorage` and client-readable login-cookie markers behind one typed persistence adapter with explicit ownership and key semantics.

Source: `FE-006` in Series `0001`.

## Context

Current auth/session persistence is mutated directly from `AuthService`, `UserContextService`, `SessionSyncService`, `AuthGuard`, login/MFA/SSO flows and recovery code. Keys include `login`, `accessToken`, `ws_accessToken`, `ws_accessToken_ts`, `scp`, `ws_scp`, `ws_refresh_lock`, `tab_id`, `preAuthorizationData`, redirect state and transient auth errors. Cookie parsing/deletion for `__logged_in` / `__logged_in_` is also repeated.

This makes atomic cleanup, migration, test setup and ownership difficult. `0026` establishes the canonical auth-state owner; this task isolates persistence underneath it.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/context/user-context.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/guards/auth.guard.ts`
- login/MFA/SSO/recovery services and pages
- client auth/session model files
- browser storage/cookie access across Angular source

## In scope

- Introduce a typed auth/session persistence port/adapter.
- Define owned keys and codecs for auth/session state used by current flows.
- Centralize client-readable login marker access.
- Replace direct persistence access from auth/session consumers with the adapter.
- Provide deterministic cleanup operations scoped to auth/session data.
- Make the adapter mockable/in-memory for unit tests.

## Out of scope

- The repository-wide versioned storage registry planned by `FE-032`; this task owns the auth/session subset needed now and should be compatible with later generalization.
- Moving unrelated preferences/theme/application cache into this adapter.
- Reading or attempting to expose server `HttpOnly` cookies. Only existing client-readable marker cookies may be represented.
- Redesigning redirect/pre-auth payload schemas; `0033` and `0034` own those semantics.
- Token protocol/server changes.

## Decisions already made

- Auth/session persistence has one adapter boundary.
- Components, guards and transport code do not directly mutate storage/cookie keys owned by auth/session.
- Clear operations are namespaced/scoped; blanket browser-storage clearing is forbidden.
- Stored structured values must be decoded defensively and invalid values fail closed.
- The adapter is infrastructure beneath the canonical store, not a second state authority.

## Requirements

1. Inventory every auth/session-related storage and cookie key and classify owner, storage medium, payload shape and lifecycle.
2. Introduce typed key constants/records and codecs for structured values rather than scattering string literals and raw `JSON.parse`/`btoa` logic.
3. Centralize get/set/remove operations for HTTP token, WS token/timestamp, scopes, initials/login marker, tab/lock state and current transitional auth values that must remain persisted.
4. Centralize read/delete logic for `__logged_in` / `__logged_in_` client markers without treating them as authentication credentials.
5. Refactor auth store/services, session sync and guards to use the adapter or higher-level store APIs.
6. Expose targeted cleanup operations such as clear authenticated-session data, clear pre-auth data and clear ephemeral auth data rather than `clear()`.
7. Handle malformed stored JSON/base64 values deterministically: return absence/invalid state and remove/quarantine as appropriate; never throw through application bootstrap.
8. Provide unit tests using isolated storage implementations so tests do not leak state between cases.
9. Document which keys remain intentionally outside this adapter for later `FE-032` migration.

## Acceptance criteria

- [ ] Auth/session production code has one persistence adapter boundary.
- [ ] Direct reads/writes of owned auth/session keys no longer occur in components, guards, interceptors or session/socket services.
- [ ] Structured persisted payloads are decoded/validated safely.
- [ ] Auth/session cleanup cannot erase unrelated application/browser storage.
- [ ] Adapter tests cover valid, missing, malformed and cleanup paths.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Search production source for the migrated literal keys and direct `localStorage` / `sessionStorage` / `document.cookie` access. Remaining occurrences must either be inside the adapter or explicitly belong to an unrelated domain scheduled for later storage-registry work.

## Browser validation

Not mandatory for the adapter itself. If a login fixture is available, perform a smoke login/logout through `http://localhost:8888` and inspect Application storage with Chrome DevTools to confirm only expected auth/session keys change and unrelated preferences remain untouched.

## Stop conditions

Mark `BLOCKED` if an existing persisted key is consumed by an undocumented external page/script outside this Angular application and changing its representation would break that consumer. Preserve the current representation until ownership is clarified.

## Dependencies

- `0026-create-canonical-angular-auth-state-store.md`

## Implementation notes

This task may introduce a domain-specific storage registry for auth now, but do not attempt the full application-wide migration described by later `FE-032`. Design the key/codec API so it can be merged into that registry without another broad rewrite.

## Execution notes

### Summary

Skipped without implementation because hard prerequisite `0026-create-canonical-angular-auth-state-store.md` (`FE-004`) is terminal `BLOCKED` pending authenticated browser validation. The canonical auth-state owner required beneath this adapter is preserved only on the frozen feature branch and is not available on `develop`.

### Validation performed

- No task branch or worker was created.
- Direct prerequisite: `FE-004` is `BLOCKED`.
- Transitive dependency chain: `FE-006` -> `FE-004` (`BLOCKED`).

### Browser validation performed

Not applicable; the task was skipped before implementation.

### Changed files

No files changed; only this task metadata was updated.

### Blocker / human decision required

No implementation blocker. The task may be re-enabled only after its hard
dependency is deliberately resolved in a new authorized session.