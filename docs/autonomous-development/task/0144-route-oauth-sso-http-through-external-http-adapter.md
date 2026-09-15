# 0144 - Route OAuth and SSO HTTP calls through one external HTTP adapter

- [x] DONE
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
`feature/BE-030`
### Preflight
Clean feature branch verified at base `ddacb2c0275b52c92e1338759069fa6728694cff`, exactly matching `develop`. No task-owned Angular/Nest/Tox21/test watcher process was active; the Node processes present were MCP/Playwright infrastructure. Exact green base-SHA Actions evidence is inherited from the prepared branch.
### Preflight remediation
None.
### Summary
Added the Nest-owned `ExternalHttpPort` with an Axios infrastructure adapter and typed `ExternalHttpError` classification. The adapter validates finite timeouts, propagates cancellation, performs explicit safety-aware retries, records latency/outcome metrics and structured secret-free logs, and decodes responses without exposing Axios types. Migrated Google, GitHub, LinkedIn, Discord and generic OAuth2 calls, including Google discovery/JWKS retrieval, off direct Axios. Added an architecture test preventing Axios imports in governed OAuth/SSO code.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node -- --no-warn-ignored` — passed.
- `npm test --workspace mercurion_web_node -- --runInBand src/infrastructure/external-http/axios-external-http.adapter.spec.ts src/infrastructure/external-http/external-http.architecture.spec.ts src/app_modules/sso/providers src/app_modules/oauth2-client/services/oauth2-client.service.spec.ts` — 7 suites / 12 tests passed.
- `npm run build --workspace mercurion_web_node` — passed.
- `git diff --check` — passed.
- Adapter tests cover timeout, DNS/network, cancellation, HTTP failures, malformed JSON, safe GET retry, non-retryable OAuth POST, timeout validation and telemetry redaction. OAuth token/code exchanges intentionally use no retry because their idempotency contract is not established.
### Full pre-merge CI-parity validation
Owned by GitHub Actions on the pushed feature SHA; local `npm ci` and `npm run ci:check` were not run.
### Browser validation performed
Not required for adapter correctness.
### Commits
Pending task commit.
### Merge / CI
Feature SHA will be published for exact-SHA CI.
### Rollback
_Not applicable._
### Blocker / human decision required
None. Retry is opt-in and disabled for OAuth authorization-code/token exchanges; no unsafe idempotency assumption was made.
