# 0180 - Consume OAuth and SSO state atomically

- [x] DONE
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
`feature/DATA-031`
### Preflight
Base SHA `fa4d3b795d9a785880fe194d018de1500f0a0326` matched the supplied
feature branch HEAD. Exact base CI run `35290378377` completed successfully
for that SHA. `npm --workspace mercurion_web_node run lint -- --no-fix`
passed before mutation. The authoritative planner reported task 0180
`READY` with hard dependencies 0179 and 0144 DONE; no stale skips were
reported.
### Preflight remediation
None. The canonical runtime capability probe started Tox21 from
`../MercurionTox21`, Nest with `APP_ENV=development` and
`LOCAL_DUMMY_AUTH=false`, then Angular in separate live sessions. After all
three handles existed, the nginx edge at `http://localhost:8888` returned
two consecutive complete readiness rounds; initial 502 responses were
transient upstream build responses. All task-owned processes were stopped
before implementation.
### Summary
Added `OAuthStateService` with a versioned provider/purpose-bound record,
opaque 256-bit state, HMAC-derived Redis lookup key and four-minute TTL.
Added atomic Redis GET-and-delete via Lua and wired both SSO and OAuth2
callbacks to consume state before token exchange/profile work. Callback
metadata, including OAuth owner identity and SSO redirect target, now comes
only from the consumed server-side record; raw state is not logged.
### Task-specific validation performed
`npm --workspace mercurion_web_node run typecheck -- --pretty false` passed.
`npm --workspace mercurion_web_node run lint -- --no-fix` passed.
Focused OAuth/SSO tests passed: 5 suites, 8 tests. The complete OAuth2/SSO
module test selection passed: 12 suites, 15 tests. `npm --workspace
mercurion_web_node run build` passed.
State tests cover opaque storage and TTL metadata, provider/purpose/expiry
rejection, and concurrent consumption where exactly one callback receives the
record.
### Full pre-merge CI-parity validation
Complete clean-install/aggregate CI parity remains assigned to GitHub Actions
on the pushed feature SHA. Local `npm ci` and `npm run ci:check` were not run.
### Browser validation performed
Post-change canonical runtime readiness was proven through
`http://localhost:8888`. Chrome DevTools MCP used the dedicated profile and
local API fixtures only. The OAuth2 provider callback fixture
`/api/oauth2/dropbox/callback?code=fixture&state=invalid-0180` returned the
structured 401 `Invalid or expired OAuth state`. The SSO callback fixture
`/api/oauth2/sso/Google/callback?code=fixture&state=invalid-0180` consumed no
state, returned the local `sso_failed` flow and landed on the local
dashboard/login surface. No external provider, credential, clipboard API or
script evaluation was used. All task-owned runtime processes were stopped
after evidence collection.
### Commits
Pending task commit on `feature/DATA-031`.
### Merge / CI
Coordinator must push this task-specific commit and wait for exact feature-SHA
CI before integration.
### Rollback
Not applicable.
### Blocker / human decision required
None.
