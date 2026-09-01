# 0042 - Scope provided-email cache to the active session

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make `AccountService`'s provided-email cache explicitly owned by the active authenticated session, finite-lived and invalidated whenever the owning session/account can change.

Source: `FE-020` in Series `0001`.

## Context

`AccountService` currently stores `ProvidedEmailDTO` in a root-service signal and `getProvidedEmail(false)` returns that value indefinitely. The cache has no owner/session identifier, TTL or logout/session-change invalidation. `AppComponent`, settings, header and sensitive-data-change flows consume or refresh the value. A root singleton can therefore retain one account's email/provider after the active session changes unless every caller happens to refetch.

## Relevant files and modules

- `MercurionWebNg/src/app/services/account.service.ts`
- canonical auth/session store from `0026` / `0038`
- `MercurionWebNg/src/app/app.component.ts`
- `MercurionWebNg/src/app/components/common/header/header.component.ts`
- `MercurionWebNg/src/app/pages/settings/settings.page.component.ts`
- sensitive-data-change email flow
- `ProvidedEmailDTO` contract/model

## In scope

- Associate the cached value with the active session/account identity.
- Give the cache an explicit finite TTL using a testable clock/configuration constant.
- Invalidate on logout, session replacement, account/email mutation and any other event that makes the value stale.
- Preserve explicit refetch semantics where callers genuinely need them.
- Prevent an old session's in-flight response from populating the new session's cache.
- Add cache ownership/expiry/race tests.

## Out of scope

- General application cache framework.
- Server-side email/provider semantics.
- User-profile cache redesign beyond this value.
- Persisting this cache across browser sessions.

## Decisions already made

- The cache is in-memory optimization, not authoritative identity state.
- Session/account ownership invalidation is authoritative; TTL is only a secondary freshness bound.
- Cache correctness must not depend on callers remembering `refetch=true`.
- A response started for session A may not become cached data for session B.

## Requirements

1. Replace the bare cached DTO with cache metadata containing owner/session identity and expiry information.
2. Obtain owner identity from the canonical active-session boundary; do not derive it from display initials.
3. Return a cached value only while owner matches the current session and TTL is valid.
4. Clear cache synchronously when the canonical session becomes anonymous/replaced/invalidated.
5. Invalidate or replace cache after a successful email/provider-changing operation.
6. Guard async writes with the initiating session identity/generation so late responses from a prior session are ignored.
7. Use an injectable/testable time source or otherwise make TTL tests deterministic; do not use real sleeps.
8. Add tests for hit, expiry, logout, user/session replacement, email change and late-response race.

## Acceptance criteria

- [ ] Cached provided-email data can never be returned for a different active session/account.
- [ ] The cache has an explicit finite TTL and deterministic expiry tests.
- [ ] Logout/session replacement invalidates it without requiring a consumer refetch.
- [ ] Successful email/provider mutation invalidates or updates the cache correctly.
- [ ] Late previous-session responses cannot poison the current cache.
- [ ] Existing consumers no longer rely on ad-hoc forced refetch for correctness.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused `AccountService` cache tests with fake/test time and two synthetic session identities, then the full canonical CI-parity gate.

## Browser validation

When local authentication fixtures are available, use `http://localhost:8888` to verify settings/header display the current account email, logout/re-login does not flash the prior account value, and a successful email change refreshes the visible value. Do not expose real credentials/data in reports.

## Stop conditions

Mark `BLOCKED` if the canonical session model still exposes no stable way to distinguish session/account ownership at execution time. Do not key the cache only by initials or another non-authoritative display value.

## Dependencies

- `0038-create-one-atomic-client-session-entity.md`

## Implementation notes

The exact TTL is an internal cache parameter, not a security boundary. Choose and document a conservative finite value only if no repository constant exists; owner/session invalidation must remain the primary correctness mechanism.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
_Not started._

### Task-specific validation performed
_Not started._

### Full pre-merge CI-parity validation
_Not started._

### Browser validation performed
_Not started / fixture-dependent._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._