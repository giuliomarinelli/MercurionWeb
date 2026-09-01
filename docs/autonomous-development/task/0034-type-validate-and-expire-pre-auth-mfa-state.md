# 0034 - Type, validate and expire pre-auth MFA state

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace free-form `sessionStorage` MFA/pre-authorization payloads with a discriminated, validated and expiring pre-auth state that is consumed atomically and fails closed when missing, malformed or stale.

Source: `FE-012` in Series `0001`.

## Context

The login flow currently serializes `preAuthorizationData` with `btoa(JSON.stringify(...))` into `sessionStorage`. `MfaPageComponent` reads and decodes it directly and `AuthRedirectService` removes it as a raw key. The payload combines pre-authorization token, enabled MFA strategies, suspicious-attempt/trust state and obscured contact details without an explicit persisted schema/version/expiry owned by one service.

Server-issued MFA metadata already includes time-related information in some steps, but client persistence has no canonical validity contract.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/login/login.page.component.ts`
- `MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts`
- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/auth-redirect.service.ts`
- auth/session persistence adapter from `0028`
- auth store from `0026`
- `MercurionWebNg/src/app/Models/confirm.models.ts`
- auth/MFA models under `MercurionWebNg/src/app/Models/auth/`

## In scope

- Define a persisted pre-auth/MFA union/schema with explicit kind/version and expiry.
- Centralize save/read/consume/clear operations.
- Validate server-returned fields before accepting them into persisted pre-auth state.
- Make MFA route entry fail closed for absent/invalid/expired state.
- Make successful/cancelled/failed terminal auth transitions consume or clear pre-auth state deterministically.
- Add tests for all supported MFA/pre-auth variants and invalid storage.

## Out of scope

- Changing MFA provider/server algorithms or OTP lifetime.
- Storing long-lived secrets in browser persistence.
- Redesigning post-auth redirect storage (`0033`).
- Adding new MFA product options.

## Decisions already made

- Pre-auth is not authenticated state and must be represented separately in the canonical auth state machine.
- Persisted pre-auth data is short-lived, versioned/typed and validated before use.
- Base64 is encoding, not validation or security; the new contract must not treat it as protection.
- Consumption of a one-time/terminal pre-auth state is atomic so reload/back navigation cannot replay completed authentication state.
- Invalid or expired payloads lead to a safe anonymous/login state, never best-effort reconstruction.

## Requirements

1. Inventory fields currently written to/read from `preAuthorizationData` across direct login, suspicious-attempt/trust verification and MFA flows.
2. Define a discriminated state model sufficient for those variants, including a format version and expiration timestamp derived from authoritative server metadata where available.
3. If the initial server response does not contain a usable expiry for the pre-authorization token, inspect the server/JWT contract and derive validity only from authoritative token claims/protocol; do not invent a longer client lifetime.
4. Move serialization/validation into the canonical persistence/pre-auth service. Components must not call raw `JSON.parse`, `atob`, `btoa` or storage APIs for this payload.
5. Validate required fields, enabled strategy values and token presence before entering the MFA state.
6. Provide one-shot consume/clear semantics for terminal success/cancel/invalid/expired paths while allowing the minimum necessary read persistence across MFA route reloads.
7. Ensure pre-auth state cannot expose `authenticated=true` or final scopes/credentials before successful completion.
8. Add tests for valid state, missing state, malformed base64/JSON legacy data, unknown version/kind, expired state, unsupported MFA strategy, successful consume and replay attempt.
9. Provide safe migration/cleanup behaviour for the existing unversioned `preAuthorizationData` value if users can encounter it during deployment; fail closed if conversion cannot be validated.

## Acceptance criteria

- [ ] Pre-auth/MFA persisted data uses one validated discriminated schema.
- [ ] Missing, malformed, unknown-version or expired state cannot enter/continue MFA.
- [ ] Components no longer parse/write `preAuthorizationData` directly.
- [ ] Successful terminal authentication consumes/clears pre-auth state.
- [ ] Replaying a consumed payload does not resume authenticated or MFA state.
- [ ] Pre-auth remains distinct from authenticated state in selectors/store tests.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused persistence/MFA tests with valid, malformed, expired and replayed payload fixtures.

## Browser validation

When a deterministic MFA account/fixture is available, use Chrome DevTools MCP through `http://localhost:8888`:

1. Enter the MFA flow and reload the MFA route; valid unexpired state should resume only as intended.
2. Complete authentication and verify pre-auth storage is removed.
3. Navigate back/reload the MFA URL and verify the consumed state cannot be replayed.
4. Manually corrupt/expire the stored payload and verify the flow fails closed to the approved login/safe route without uncaught exceptions.

If MFA credentials are unavailable, deterministic component/service tests are sufficient for task completion; record browser validation as unavailable rather than inventing data.

## Stop conditions

Mark `BLOCKED` if the authoritative lifetime/validity of the pre-authorization token cannot be determined from the server contract/token claims and implementing a client expiry would require inventing security semantics. Request the server-side validity rule.

## Dependencies

- `0010-unify-session-state-protocol.md`
- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`
- `0033-centralize-safe-post-auth-redirect-state.md`

## Implementation notes

A small codec/result type (`valid | missing | invalid | expired`) is preferable to throwing during route initialization. Keep sensitive persisted data to the minimum required by the current protocol.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / fixture-dependent._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._