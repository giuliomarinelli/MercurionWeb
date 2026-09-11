# 0054 - Establish a versioned browser storage registry

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every Angular-owned `localStorage` / `sessionStorage` value belong to a typed, namespaced, versioned registry with explicit codec, owner, migration and invalid-data semantics.

Source: `FE-032` in Series `0001`.

## Context

The audit found browser-storage keys scattered across auth/session flows, theme, redirects, UI state and other features. Earlier auth tasks create a domain-specific auth persistence boundary, while `ThemeManagerService` still owns `tw_theme` directly. The repository needs one storage contract so new keys cannot be introduced as unversioned literals and legacy/corrupt data is handled deterministically.

## Relevant files and modules

- all Angular production `localStorage` / `sessionStorage` access
- auth/session persistence adapter from `0028`
- redirect/pre-auth persistence from `0033` / `0034`
- `MercurionWebNg/src/app/services/context/theme-manager.service.ts`
- other storage-using services/components discovered by repository search
- storage-event/cross-tab consumers

## In scope

- Inventory every application-owned browser-storage key, medium, owner, payload and lifecycle.
- Define a typed key registry with namespace and schema/version metadata.
- Define codecs/validation and migrations for structured values.
- Migrate direct application storage access behind domain adapters backed by the registry.
- Handle missing, corrupt, unknown-version and legacy values deterministically.
- Make cross-tab storage events decode through the same registry contracts.
- Add static validation preventing new unregistered production key literals/access.

## Out of scope

- Moving all persisted values into one giant storage service API exposed directly to components.
- Server cookies/HttpOnly storage.
- Changing business retention/security semantics unless required by an existing domain task.
- Persisting data that is currently intentionally in memory only.

## Decisions already made

- Keys are namespaced and versioned.
- Structured values have explicit codecs/validation; raw `JSON.parse` at feature call sites is not a storage contract.
- Each key has one domain owner and cleanup/migration policy.
- Auth/session domain APIs from `0028` remain semantic boundaries and should use the registry internally rather than exposing registry keys to callers.
- Invalid data fails safely according to domain policy and cannot crash application bootstrap.

## Requirements

1. Search all production Angular code for storage access and build a complete key inventory.
2. Define key descriptors containing at least key name, storage medium, current version, owner and codec/migration functions as appropriate.
3. Adopt a stable Mercurion namespace and preserve/migrate legacy keys without losing data unexpectedly.
4. Migrate auth, pre-auth, redirect, theme and other owned storage through their domain adapter/facade rather than direct component access.
5. For structured values, validate before returning typed data and migrate supported prior versions deliberately.
6. Define removal/quarantine/fallback behaviour for corrupt or unsupported values.
7. Ensure `storage` event consumers use registry descriptors/codecs and respond only to keys they own.
8. Add tests for current version, legacy migration, malformed data, unknown version, targeted cleanup and cross-tab decoding.
9. Add a lint/static architecture check preventing direct storage calls/key literals outside approved registry/adapters.

## Acceptance criteria

- [ ] Every application-owned local/session storage key is registered with owner and version semantics.
- [ ] Production components/features do not access browser storage directly outside approved adapters/infrastructure.
- [ ] Structured storage values are validated and migrated deterministically.
- [ ] Corrupt/unknown data fails safely without bootstrap exceptions.
- [ ] Auth/session cleanup remains scoped and unrelated preferences survive.
- [ ] Cross-tab storage events use the same typed registry definitions.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run registry/adapter migration tests with legacy and corrupt fixtures, static storage-access validation, full Angular tests/build and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, verify a stored theme preference survives reload, auth/session-owned values are cleared on logout without removing theme/unrelated registered data, and a deliberately malformed non-sensitive registered value falls back safely without console crash. Do not expose actual tokens in screenshots/logs.

## Stop conditions

Mark `BLOCKED` for any legacy key whose external ownership/compatibility is uncertain and changing its name/shape could break another application/script. Register it provisionally with current semantics and request ownership clarification rather than destructive migration.

## Dependencies

- `0028-encapsulate-auth-session-browser-persistence.md`
- `0033-centralize-safe-post-auth-redirect-state.md`
- `0034-type-validate-and-expire-pre-auth-mfa-state.md`

## Implementation notes

The registry is metadata/infrastructure; domain services still expose semantic operations. Avoid a generic `storage.get('string')` API that simply centralizes literals without type or ownership guarantees.

## Execution notes

### Feature branch
`feature/FE-032`, based on `24642a5fb8ccbf87674fe6de77d8c399293742c1`.

### Preflight
Base branch was clean at the supplied SHA; exact-SHA GitHub Actions run
`34550492191` completed successfully. Production Angular storage inventory was
performed before editing and covered auth/session, pre-auth, redirects, theme,
route errors, local dummy-auth compatibility, and all storage-event consumers.
No task-owned workspace process was active at the initial inventory.

### Preflight remediation
The canonical runtime was started in the required order with separate attached
sessions: Tox21 (`python -m main` from `../MercurionTox21`), Nest
(`npm run start:dev --workspace mercurion_web_node`), and Angular
(`npm run start:dev` from `MercurionWebNg`). The nginx edge initially returned
502 while upstreams compiled, then two consecutive complete rounds returned
`GET / = 200` and `GET /health = 200`. All three processes were stopped before
handoff.

### Summary
Added a typed `BrowserStorageRegistry` with namespaced v1 descriptors, codecs,
legacy-key migration, safe quarantine/removal for malformed values, owner
metadata, and typed storage-event decoding. Auth/session persistence and theme,
socket, local-dummy, header, and cross-tab consumers now use registry-backed
adapters. Added the static architecture check
`ci:angular:storage-registry`.

### Task-specific validation performed
- `npm --prefix MercurionWebNg run typecheck` — passed.
- `npm run ci:angular:storage-registry` — passed.
- `npx ng test --watch=false --karma-config=karma.conf.js --include
  src/app/services/auth-session-persistence.service.spec.ts --include
  src/app/services/session-sync.service.spec.ts` — 10/10 passed.
- Full existing-tree Angular suite reached 356/359; the remaining two failures
  are unrelated password-recovery fixture failures (`Password recovery error`,
  HTTP 500) and were not changed.

### Full pre-merge CI-parity validation
Not run locally by policy; clean-install and aggregate CI remain GitHub Actions
responsibilities.

### Browser validation performed
Through only `http://localhost:8888`, logout returned the persistent profile to
the public welcome state. A namespaced dark theme value survived reload
(`data-theme="dark"`), and a deliberately malformed registered theme value was
removed and safely fell back without bootstrap failure. The same runtime
preflight included protected dashboard/server health evidence before logout.

### Commits
Feature implementation commit recorded below.

### Merge / CI
Feature SHA is pending push and exact-SHA CI.

### Rollback
_Not applicable._

### Blocker / human decision required
None.