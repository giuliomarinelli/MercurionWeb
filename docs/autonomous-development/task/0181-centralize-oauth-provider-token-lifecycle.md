# 0181 - Centralize OAuth provider-token lifecycle

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
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

- [ ] Durable provider tokens are encrypted at rest behind one credential boundary.
- [ ] Access-token cache is owner/provider scoped, TTL-bound and removed on revoke.
- [ ] Refresh rotation/revocation are explicit and tested.
- [ ] Public DTOs/logs/errors never contain raw provider tokens.
- [ ] Cross-owner/provider credential access fails deterministically.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0144` (BE-030, SKIPPED_DEPENDENCY), `0180` (DATA-031, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0129 BE-015 SKIPPED_DEPENDENCY -> 0144 BE-030 SKIPPED_DEPENDENCY -> 0181 DATA-032 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
