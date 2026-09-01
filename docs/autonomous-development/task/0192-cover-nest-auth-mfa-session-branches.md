# 0192 - Cover Nest auth, MFA and session branches

- [ ] DONE
- [ ] BLOCKED

## Objective

Build comprehensive deterministic Nest tests for authentication, MFA and session security branches, including expiry/replay/revocation, concurrent sessions and refresh, scopes, external-provider flows, rate limits and Redis failure modes.

Source: `QA-006` in Series `0001`.

## Context

The BE/DATA tasks decompose large auth services, centralize token/session policy and redesign Redis session persistence to be indexed, atomic and versioned. Those changes affect security boundaries that cannot be protected by constructor smoke tests. The suite must prove both ordinary success and adversarial/failure transitions without depending on live identity providers or nondeterministic wall-clock behavior.

## Relevant files and modules

- decomposed auth services/use cases from BE tasks
- MFA services/policies
- session repository/service from `0179` and `0186`
- JWT issuance/refresh/revocation services
- scope/authorization guard/policy
- SSO/OAuth adapters
- rate-limit/attempt policy from DATA tasks
- Redis integration-test infrastructure

## In scope

- Test valid/expired/not-yet-valid/revoked/replayed token paths according to the canonical token contract.
- Test refresh success, stale/replayed refresh and concurrent refresh/revoke behavior.
- Test one/multiple session/device policies and concurrent login/session replacement.
- Test MFA success, invalid code, expiry, retry/rate-limit exhaustion and replay where applicable.
- Test scope accepted/denied behavior and transport error classification.
- Test external-provider success/failure through deterministic provider adapters rather than live vendors.
- Inject Redis/transient persistence failures and verify no partial security state is accepted.
- Use real Redis integration tests for atomicity/expiry branches that mocks cannot prove.

## Out of scope

- Do not contact real OAuth/SSO providers in CI.
- Do not duplicate Angular client-state-machine tests from `0190`.
- Do not reduce security assertions because an implementation branch is difficult to arrange.
- Do not assert secrets/tokens verbatim in snapshots/log output.

## Decisions already made

- Security-sensitive async races have deterministic winners and failure behavior.
- Revoked/expired/malformed security material fails closed.
- Infrastructure errors are distinct from normal invalid-credential/business outcomes.
- Persistence-dependent atomicity is tested against the real Redis-compatible implementation.

## Requirements

1. Provide deterministic clock/token fixtures and cryptographic test keys that are safe to commit/use in tests.
2. Cover token issuance/validation for valid, expired, malformed, revoked and replay scenarios.
3. Exercise overlapping refresh, logout/revoke and session-replacement operations with controlled completion order/concurrency.
4. Cover MFA attempt limits, expiration and one-shot semantics.
5. Cover authorization scopes for at least allowed, missing and insufficient scope cases.
6. Cover configured external-provider branches using explicit in-memory/test adapters with success and representative failure payloads.
7. Run session/rate-limit Redis tests against a real isolated Redis service, including injected transaction/script failures where feasible.
8. Assert cleanup/rollback leaves no valid partial session/token state after failure.

## Acceptance criteria

- [ ] Expiry, replay and revocation paths are explicitly tested.
- [ ] Concurrent refresh/session/revoke behavior preserves security invariants.
- [ ] MFA success/failure/expiry/rate-limit branches are covered.
- [ ] Scope and external-provider branches have deterministic tests.
- [ ] Redis failures cannot create or preserve an unintended valid security state.
- [ ] No test depends on live provider networks or production credentials.

## Validation

Run focused auth/MFA/session unit tests, real-Redis integration/concurrency tests, complete Nest unit/E2E suites, lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not required for this server test task; browser/system auth journeys are covered by `0195` and `0197`.

## Stop conditions

Mark `BLOCKED` if a security transition remains ambiguous after the corresponding BE/DATA task or if the deployed Redis capability differs from the tested atomic primitive and requires an infrastructure decision.

## Dependencies

- Auth/MFA/session decomposition tasks in BE section must be `DONE`.
- `0179` atomic Redis session topology and `0186` session codec should be `DONE`.
- `0188` must provide import-safe Jest/bootstrap and natural teardown.

## Implementation notes

Use mocks for pure collaborators and real Redis for Redis semantics. A mocked `multi()`/Lua success does not prove atomic session invariants under concurrency.

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._