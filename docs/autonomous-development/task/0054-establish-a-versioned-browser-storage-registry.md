# 0054 - Establish a versioned browser storage registry

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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
No task branch or worker was created because hard prerequisites `0028` (`FE-006`),
`0033` (`FE-011`), and `0034` (`FE-012`) are terminal
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. The direct persistence,
redirect, and pre-auth prerequisites are terminal `SKIPPED_DEPENDENCY`; their
transitive root cause includes blocked `0026` (`FE-004`) and `0010`
(`SYS-010`).

### Task-specific validation performed
No implementation or validation was performed.

### Full pre-merge CI-parity validation
Not applicable; no feature branch was created.

### Browser validation performed
Not applicable; the task was skipped before implementation.

### Commits
Only this task metadata was updated on `develop`.

### Merge / CI
No feature merge; skip metadata CI is required before continuing.

### Rollback
_Not applicable._

### Blocker / human decision required
No implementation blocker. Re-enable only after the hard dependency chain is
deliberately resolved in a new authorized session.