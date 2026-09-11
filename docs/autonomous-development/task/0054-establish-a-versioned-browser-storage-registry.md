# 0054 - Establish a versioned browser storage registry

- [ ] DONE
- [x] BLOCKED
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
`feature/FE-032`, frozen at `037321418c25ec92892b2248f2b0fa674ea726f0`.

### Preflight
Passed. The required Tox21, Nest, and Angular runtime startup order, two
readiness rounds, fresh login, protected-session proof, browser validation, and
task-owned process shutdown were completed.

### Preflight remediation
_None._

### Summary
The implementation and focused validation completed successfully, but the
exact feature-SHA CI could not be verified after the bounded repair cycle.

### Task-specific validation performed
Registry migration/static checks, focused Angular tests, typecheck, and browser
storage validation passed. The local full Angular suite had two unrelated
existing password-recovery fixture failures.

### Full pre-merge CI-parity validation
Initial feature run `34552194747` failed in Angular Test on Ubuntu and Windows
with an auth-state transition assertion. Repair commit `506360331` corrected
that repository-controlled failure. Repair SHA
`ff103bea87cb59b54b131e7f1ed70a24cc49f516` passed Ubuntu, but run
`34552682547` failed on Windows in Angular Test with only a Chrome Headless
152 disconnect/reconnect timeout and no repository-controlled diagnostic.

### Browser validation performed
Theme persistence, safe malformed-value fallback, and logout cleanup were
verified through `http://localhost:8888`; no console crash was observed.

### Commits
Implementation and repair commits are preserved on the frozen feature branch;
this commit records the blocked outcome on `develop`.

### Merge / CI
No feature merge. The feature branch remains preserved and frozen.

### Rollback
_Not applicable._

### Blocker / human decision required
The Windows exact-SHA result is uncorrelated and unverifiable after one repair
attempt; human review is required before retrying this task.