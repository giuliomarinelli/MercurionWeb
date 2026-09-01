# 0180 - Consume OAuth and SSO state atomically

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every OAuth/SSO authorization `state` a cryptographically random, TTL-bound, provider/session/redirect-bound one-time capability that is validated and consumed atomically so replay, concurrent reuse and cross-provider substitution fail.

Source: `DATA-031` in Series `0001`.

## Context

`SocialAuthService` creates a random state and stores an HMAC-keyed Redis entry containing encrypted redirect data, but `validateCallbackState()` checks existence and `retrieveRedirectTo()` reads it separately; neither operation atomically consumes the value. Concurrent callbacks can therefore observe the same valid state. The generic `OAuth2ClientService.getAuthorizationUrl()` also places `userId` directly in the provider `state` parameter, which is not a one-time CSRF capability. The earlier external-HTTP/auth tasks do not fix this persistence/replay semantics.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/sso/services/social-auth.service.ts`
- SSO controllers/provider clients/registry
- `MercurionWebNode/src/app_modules/oauth2-client/services/oauth2-client.service.ts`
- OAuth2 controllers/callbacks
- Redis key registry/service
- redirect validation/auth session context

## In scope

- Define one state record schema for browser SSO and provider OAuth connections where compatible.
- Generate high-entropy opaque state values; never use raw user IDs as CSRF state.
- Bind state to provider, intended callback/use case, initiating session/user where applicable and sanitized redirect target.
- Enforce short TTL.
- Atomically get-and-delete/consume the state using Redis atomic primitives.
- Ensure only the consumed record supplies trusted redirect/user/session metadata.
- Add replay, concurrent callback, expiry, wrong-provider and tampered-state tests.

## Out of scope

- Do not redesign provider token storage; `0181` owns token lifecycle/protection.
- Do not weaken same-origin redirect sanitization established by FE-011.
- Do not store access/refresh tokens in the state record.

## Decisions already made

- OAuth/SSO state is opaque and one-time.
- Validation and consumption are one atomic operation, not `exists/get/delete` steps.
- Callback identity/context comes from server-side state, not attacker-controlled query data.

## Requirements

1. Inventory every authorization URL and callback that uses `state` in SSO and OAuth2-client modules.
2. Introduce a typed state codec containing version, provider, purpose, created/expires metadata, redirect and owner/session binding as required.
3. Store only an HMAC/hashed lookup key if raw state should not appear in Redis key names/logs.
4. Implement an atomic consume operation (`GETDEL`, Lua or equivalent supported capability) that returns the record exactly once.
5. Validate provider/purpose/owner binding after retrieval and treat mismatch as invalid without restoring the state.
6. Remove `state: userId` and any separate validate-then-retrieve callback sequence.
7. Ensure logs never include raw state values.
8. Add tests where two callbacks race on the same state and exactly one succeeds.

## Acceptance criteria

- [ ] Every OAuth/SSO state value is random, opaque and TTL-bound.
- [ ] State is atomically consumed at most once.
- [ ] Replay, cross-provider and expired-state callbacks fail deterministically.
- [ ] Raw user IDs/redirects are not trusted from the callback `state` string itself.
- [ ] State secrets are absent from logs/errors.

## Validation

Run SSO/OAuth callback integration tests with Redis, explicit concurrent-replay tests, provider mismatch/expiry tests, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate at least one configured SSO login and one OAuth provider connect flow through `http://localhost:8888` where local provider credentials/fixtures are available; otherwise use deterministic provider callback integration fixtures.

## Stop conditions

Mark `BLOCKED` if a provider imposes nonstandard state-size/format constraints that conflict with the canonical opaque token and no tested compatible encoding is available.

## Dependencies

- `0179-make-session-redis-operations-indexed-and-atomic.md` should be `DONE` for canonical Redis primitives.
- FE-011 redirect sanitization and BE-033/`0144` external OAuth HTTP adapter should be `DONE`.

## Implementation notes

A state record should be consumed before token exchange so a slow/failing provider exchange cannot leave a replayable state. If retrying token exchange is required, persist a separate server-side callback workflow identity rather than reusing the CSRF state.

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
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._