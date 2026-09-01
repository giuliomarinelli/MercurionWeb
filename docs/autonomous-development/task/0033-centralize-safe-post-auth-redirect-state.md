# 0033 - Centralize safe post-auth redirect state

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace divergent `redirect_to` / `redirectAfterLogin` producers, consumers and sanitizers with one one-shot, same-origin redirect store used consistently by guard, login, MFA and SSO flows.

Source: `FE-011` in Series `0001`.

## Context

Current redirect handling is distributed. `AuthGuard` creates `/login?redirect_to=...`; login and MFA maintain `redirectAfterLogin` state; MFA and SSO have their own `sanitizeRedirectTo()` implementations; SSO falls back from the provider query parameter to session storage. `SessionSyncService` also constructs a login URL containing `redirect_to`.

The security requirement is stronger than merely starting with `/`: redirect state must be one-shot, same-origin and canonical so no auth entry path can create an open redirect or replay stale navigation intent.

## Relevant files and modules

- `MercurionWebNg/src/app/guards/auth.guard.ts`
- `MercurionWebNg/src/app/pages/login/login.page.component.ts`
- `MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts`
- `MercurionWebNg/src/app/pages/sso/sso.page.component.ts`
- `MercurionWebNg/src/app/services/auth-redirect.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- auth/session persistence adapter from `0028`
- Angular Router/UrlTree usage

## In scope

- Introduce one redirect-intent service/store with safe parsing, persistence and one-shot consumption.
- Use the same implementation from guard, session-expiry redirect, password login, MFA and SSO callback.
- Preserve full same-origin path/query/fragment where allowed.
- Reject external, protocol-relative, malformed and auth-loop destinations.
- Remove duplicated redirect keys/sanitization helpers.
- Add security-focused tests.

## Out of scope

- General route manifest/access policy refactor (`FE-019`, `FE-035`).
- OAuth provider configuration/server callback changes except consuming the existing redirect value safely.
- Arbitrary external redirect support.
- Persisting redirect intent longer than needed for a single auth flow.

## Decisions already made

- Post-auth redirects are same-origin only.
- Redirect intent is one-shot and removed atomically when consumed or invalidated.
- There is one canonical key/codec if persistence is required.
- A rejected/missing redirect falls back to one existing safe application destination; if the intended fallback differs among flows and is not documented, preserve current safe semantics until explicitly decided rather than inventing a new product destination.
- Auth routes must not be able to create redirect loops back into an incomplete login/MFA flow.

## Requirements

1. Inventory every producer/consumer of `redirect_to`, `redirectAfterLogin` and redirect sanitation.
2. Create one service/store API for capturing a requested `UrlTree`/URL, validating it, persisting it across the auth flow if necessary, peeking only where truly needed, and consuming it once.
3. Validate using Angular/URL semantics rather than string-prefix checks alone. Reject absolute external URLs, protocol-relative URLs, backslash/encoding tricks and invalid destinations.
4. Preserve same-origin query string and fragment when valid.
5. Guard-generated redirects and `SessionSyncService` session-expiry redirects must use the same store/API.
6. Login, MFA and SSO must consume the same redirect intent rather than each implementing sanitation/fallback.
7. Remove duplicate `sanitizeRedirectTo` methods and ad-hoc `sessionStorage` key handling.
8. Ensure stale redirect intent is cleared on successful consumption, logout, explicit auth cancellation and invalid payload.
9. Add tests for safe paths, query/fragment, external URLs, `//host`, encoded/protocol tricks, auth-loop targets, stale/replayed values and SSO round-trip fallback.

## Acceptance criteria

- [ ] One redirect-intent implementation serves guard, login, MFA, SSO and session-expiry navigation.
- [ ] No duplicate redirect sanitizer or raw `redirectAfterLogin` access remains in production auth code.
- [ ] Valid same-origin path/query/fragment round-trips correctly through authentication.
- [ ] External/protocol-relative/malformed/open-redirect payloads are rejected.
- [ ] Redirect intent is consumed at most once and cannot replay after successful login/logout.
- [ ] Auth-loop destinations fall back safely.
- [ ] Security-focused tests and Angular build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused redirect-store tests with a table of valid and hostile URL inputs.

## Browser validation

Mandatory when login credentials are available, through `http://localhost:8888`:

1. Navigate anonymously to a protected URL containing query parameters.
2. Verify login captures that exact safe intent.
3. Complete login and confirm a one-time return to the intended same-origin URL.
4. Repeat with a deliberately external/protocol-relative `redirect_to` and verify it is rejected and never leaves `localhost:8888`.
5. Confirm refresh/back navigation does not replay an already consumed redirect.

If credentials are unavailable, automated router/security tests remain mandatory and the browser portion may be recorded as blocked.

## Stop conditions

Mark `BLOCKED` if different auth flows have intentional, undocumented fallback destinations whose product semantics cannot be preserved under one store. Report each current fallback and request the canonical fallback policy rather than selecting one arbitrarily.

## Dependencies

- `0028-encapsulate-auth-session-browser-persistence.md`
- `0027-unify-authenticated-session-selector.md`

## Implementation notes

Prefer storing a normalized internal application URL/`UrlTree` representation, not a trusted arbitrary string. Validation should happen both when capturing external/query input and when consuming persisted legacy values.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._