# 0144 - Route OAuth and SSO HTTP calls through one external HTTP adapter

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make OAuth/SSO provider clients depend on one Nest-owned external HTTP port/adapter that provides validated timeouts, permitted retry/cancellation semantics, metrics and typed infrastructure errors instead of calling Axios directly.

Source: `BE-030` in Series `0001`.

## Context

GitHub, Discord, LinkedIn and Google SSO provider clients plus `OAuth2ClientService` currently invoke `axios.get/post` directly and therefore own local timeout/error mapping/retry decisions. `AuthModule` already imports Nest `HttpModule`, but it is not the authoritative outbound transport boundary.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/sso/providers/`
- `MercurionWebNode/src/app_modules/oauth2-client/services/oauth2-client.service.ts`
- Nest `HttpModule`/outbound infrastructure
- typed application errors from `0127`
- structured logger/metrics ports
- provider-client tests

## In scope

- Define a narrow `ExternalHttpPort` and Nest adapter around the chosen HTTP client.
- Support typed method/url/headers/body, timeout, cancellation signal and response decoding without exposing raw Axios types to domains.
- Define retry policy explicitly: retry only operations/statuses proven safe/idempotent or explicitly allowed by the caller contract.
- Normalize DNS/connect/timeout/TLS/HTTP/protocol failures to typed infrastructure/provider errors with causes retained for observability.
- Emit latency/outcome metrics and structured logs without tokens/secrets.
- Migrate OAuth2 and SSO provider clients off direct Axios imports.

## Out of scope

- Do not migrate Dropbox storage orchestration here; `DATA-027/028` owns its storage/compensation design, though it may later reuse this adapter.
- Do not change provider OAuth scopes/flows or token retention policy.
- Do not retry authorization-code/token exchanges unless their exact provider/idempotency semantics permit it.

## Decisions already made

- Application/provider code does not depend on Axios directly.
- Every external call has a finite validated timeout and cancellation path.
- Retry is opt-in/safety-aware, never a blanket interceptor.
- Sensitive authorization/token values are redacted from telemetry.

## Requirements

1. Inventory direct Axios calls in OAuth2/SSO and their current error/timeout semantics.
2. Introduce the port/adapter in a neutral infrastructure module with one owner.
3. Define per-operation timeout/retry policy through typed request options/config.
4. Migrate Google/GitHub/LinkedIn/Discord and generic OAuth2 calls to the adapter.
5. Add cancellation propagation from request/use-case scope where applicable.
6. Add unit tests for timeout, network failure, 4xx/5xx, malformed payload, cancellation and retry-eligible/non-eligible operations.
7. Add a static architecture rule preventing direct `axios` imports in governed provider/application code.

## Acceptance criteria

- [ ] OAuth/SSO production code contains no direct Axios calls.
- [ ] External calls have finite timeout and typed failure classification.
- [ ] Retry/cancellation semantics are explicit and tested.
- [ ] Telemetry contains latency/outcome but no credentials/tokens.
- [ ] Provider flows remain behaviourally compatible.

## Validation

Run provider/HTTP-adapter tests with mocked transport, OAuth/SSO integration tests, strict typecheck, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not required for adapter correctness. If local provider credentials are available, browser smoke testing may verify an SSO redirect/callback through `http://localhost:8888`; absence of credentials is not a reason to fake provider success.

## Stop conditions

Mark `BLOCKED` if a provider operation's retry/idempotency contract cannot be established safely and implementing a retry is required for acceptance; default to no retry rather than guessing.

## Dependencies

- `0127` typed errors, `0129` LoggerPort and `0130` canonical config must be `DONE`.

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
_Not applicable / not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
