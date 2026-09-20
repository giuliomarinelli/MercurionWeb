# 0181 - Centralize OAuth provider-token lifecycle

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Put provider access/refresh tokens behind one owner-scoped credential boundary that encrypts persisted secrets, minimizes exposure, handles refresh/revocation/deletion explicitly and prevents tokens from appearing in DTOs, logs or generic Redis/database access.

Source: `DATA-032` in Series `0001`.

## Context

`OAuth2ClientService` currently exchanges/refreshes provider tokens directly, stores access tokens under Redis keys such as `access_token:<provider>[:userId]`, and delegates refresh-token persistence to `OAuth2PersistenceService`, which writes the refresh token directly to `OAuth2TokenEntity`. Provider token lifecycle, encryption, rotation, cache TTL, owner scoping and revocation are not represented by one application boundary. Error logs also interpolate provider response data and must be reviewed for accidental credential exposure.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/oauth2-client/services/oauth2-client.service.ts`
- `o-auth2-persistence.service.ts`
- `OAuth2TokenEntity` and token DTO/interfaces
- SSO/provider adapters where provider credentials are stored
- Redis key/codec infrastructure
- security/encryption service
- external HTTP adapter from `0144`

## In scope

- Define a provider-credential store/service with owner+provider identity and explicit token states.
- Encrypt refresh tokens and any durable access-token material at rest using the approved application key-management/encryption boundary.
- Minimize access-token caching and bind TTL to provider expiry.
- Handle refresh-token rotation atomically.
- Add explicit revoke/disconnect/delete operations and retention semantics.
- Redact provider token values and sensitive provider response fields from logs/errors/traces.
- Prevent raw token fields from appearing in public DTOs or general-purpose entity serialization.
- Add security tests for cross-owner access, rotation, revocation and redaction.

## Out of scope

- Do not redesign OAuth state; `0180` owns CSRF/state consumption.
- Do not build a general enterprise secrets-management product.
- Do not log tokens for debugging even in development/test fixtures.

## Decisions already made

- Provider tokens are secrets, not ordinary entity fields.
- Credential lookup is always owner/provider scoped except for explicitly documented application-wide credentials.
- Refresh-token rotation never leaves both old/new persisted inconsistently.

## Requirements

1. Inventory all access/refresh/provider tokens in PostgreSQL, Redis, memory, DTOs and logs.
2. Define a typed credential record with provider, owner scope, token metadata/expiry and encrypted secret material.
3. Encrypt before persistence and decrypt only inside the credential boundary at the point of provider use.
4. Use the canonical Redis key registry for short-lived access-token cache; never cache beyond provider expiry and remove on revoke/disconnect.
5. Persist rotated refresh tokens atomically before considering refresh complete; define safe behavior if the provider invalidates the old token before local persistence succeeds.
6. Implement explicit revoke/disconnect path, calling provider revocation when supported and always deleting local credentials/idempotently.
7. Redact Authorization headers, token response fields, URL/query secrets and provider error bodies through the logging/HTTP boundary.
8. Add tests proving a token cannot be loaded by another user/provider key and no token literal appears in captured logs/errors.

## Acceptance criteria

- [x] Durable provider tokens are encrypted at rest behind one credential boundary.
- [x] Access-token cache is owner/provider scoped, TTL-bound and removed on revoke.
- [x] Refresh rotation/revocation are explicit and tested.
- [x] Public DTOs/logs/errors never contain raw provider tokens.
- [x] Cross-owner/provider credential access fails deterministically.

## Validation

Run OAuth provider fake-server integration tests for exchange/refresh/rotation/revoke, persistence encryption assertions, log-redaction tests, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate connect, use and disconnect/reconnect for an OAuth-backed feature through `http://localhost:8888` when provider fixtures/credentials are available.

## Stop conditions

Mark `BLOCKED` if the repository lacks an approved encryption-key source/rotation policy for durable provider credentials or if provider-specific revocation requirements need a human security decision.

## Dependencies

- `0180-consume-oauth-and-sso-state-atomically.md` should be `DONE`.
- `0144` shared external HTTP adapter and canonical config/secrets validation must be `DONE`.

## Implementation notes

Database/storage-level encryption alone does not make raw token columns safe from application logs, accidental DTO serialization or overly broad repository access. Keep application-level secret handling narrow and explicit.

## Execution notes

### Feature branch
`feature/DATA-032` preserved and frozen at
`94ce196d5bfb52cfc1ff169b6cf56038a1696fca`.
### Preflight
- Exact base CI run `35292525166` succeeded for base SHA
  `9db273352958663a9bdf6499c1037c6931feef67`; focused Nest lint passed.
- Runtime readiness and Chrome DevTools capability passed through the
  canonical edge; all task-started processes were stopped.
### Preflight remediation
None. The canonical runtime probe issued the required live sessions in order:
Tox21 from `../MercurionTox21`, Nest with `APP_ENV=development` and
`LOCAL_DUMMY_AUTH=false`, then Angular. After all three handles existed,
`http://localhost:8888/health` and `http://localhost:8888/` returned two
consecutive complete `200` readiness rounds. All task-started runtime
sessions were stopped before task mutation; no sibling-repository files were
changed. Chrome DevTools MCP capability was callable through the
non-navigating `list_pages` probe. The dedicated browser profile was already
authenticated; navigating to `http://localhost:8888/login` redirected to the
local dashboard, so no credential entry was needed for this pre-change
stop-condition review.
### Summary
Blocked before implementation because the repository lacks an approved
durable provider-credential encryption key ownership, rotation, re-encryption,
retirement and recovery policy. No application changes were made.
### Task-specific validation performed
- Pre-change focused lint passed; no implementation validation was applicable.
### Full pre-merge CI-parity validation
- Not applicable; the task was blocked before implementation.
### Browser validation performed
- Runtime/browser capability only; no OAuth connect/use/disconnect flow was run.
### Commits
Diagnostic commit `94ce196d5bfb52cfc1ff169b6cf56038a1696fca` is preserved on
`feature/DATA-032`; blocked status is recorded on `develop`.
### Merge / CI
No merge; exact diagnostic metadata CI run `35293660184` succeeded.
### Rollback
Not applicable.
### Blocker / human decision required
Human security decision required for the durable provider-credential encryption
boundary, key source/ownership, rotation/versioning, re-encryption,
retirement/recovery semantics and provider-specific revocation requirements.

### Manual recovery 2026-09-20
- Direct human authorization resumed the frozen branch and approved manual
  AI-assisted completion outside the former autonomous stop condition.
- Added a dedicated credential cipher/store boundary. It derives a
  purpose-specific AES-256-GCM key with HKDF from deployment-owned root
  material and binds every versioned envelope to normalized provider and owner
  scope as authenticated data. Raw legacy rows are re-encrypted on first read;
  the entity excludes secret material from default selection and serialization.
- Added the repository policy for key ownership, versioned rotation,
  re-encryption, retirement and loss recovery. No secret value is committed.
- Access-token keys remain canonical owner/provider Redis keys, reject invalid
  expiries, and are removed during idempotent disconnect. Dropbox declares its
  supported revoke endpoint; local deletion completes even if remote revoke
  fails.
- Refresh rotation persists the encrypted replacement before exposing the new
  access token. Provider response bodies and token literals are absent from
  application logs and public errors.
- Focused OAuth/security validation passed: 6 suites / 16 tests plus 3
  configuration/redaction suites / 33 tests; Nest lint, typecheck and build
  passed. The browser provider flow was not run because no local fake-provider
  browser fixture is configured; the same exchange/refresh/rotation/revoke
  behavior is covered through the injected provider HTTP port.
- Final DONE status remains subject to exact feature-SHA and post-merge-SHA
  Required gate success.
