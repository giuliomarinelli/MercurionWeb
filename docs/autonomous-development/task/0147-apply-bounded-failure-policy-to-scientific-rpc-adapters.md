# 0147 - Apply one bounded failure policy to scientific RPC adapters

- [ ] DONE
- [ ] BLOCKED

## Objective

Give MercurionAI and RDKit calls one explicit validated policy for input limits, timeouts, concurrency/backpressure and stable failure classification instead of repeating hard-coded `timeout(3000)` and generic error mapping.

Source: `BE-033` in Series `0001`.

## Context

`MercurionAIService` and `RDKitService` both check `App.maxNatsPayloadBytes`, both use a hard-coded 3000 ms RxJS timeout and both translate most non-timeout failures into generic `RpcException` strings. RDKit repeats this for three operations. These scientific calls can be CPU/queue intensive on the peer, so uncontrolled concurrency and indistinguishable transport/overload/invalid-response failures are operationally unsafe.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/mercurion-ai/services/mercurion-ai.service.ts`
- `MercurionWebNode/src/app_modules/mercurion-ai/services/rd-kit.service.ts`
- typed NATS registry from `0146`
- canonical config/error/logger/metrics infrastructure
- scientific RPC tests

## In scope

- Define one scientific RPC policy/adapter used by inference and RDKit operations.
- Validate serialized request size and operation-specific semantic input bounds before NATS dispatch.
- Move timeout values to validated per-operation/default config while preserving current effective behaviour unless deliberately changed.
- Enforce bounded in-flight concurrency/queueing or explicit rejection/backpressure policy.
- Introduce circuit/failure-state handling only with deterministic thresholds/config and observable state.
- Map timeout, overload/backpressure, unavailable transport, invalid response and remote application failure to stable typed errors.
- Emit latency, outcome, timeout/overload and circuit/backpressure metrics.

## Out of scope

- Do not alter Tox21/RDKit scientific algorithms or output interpretation.
- Do not automatically retry non-idempotent/expensive calls unless the registry/policy explicitly proves it safe.
- Do not modify `../MercurionTox21`.
- Do not invent materially different production capacity limits without approved config; preserve current limits as defaults where necessary.

## Decisions already made

- Scientific RPCs are bounded in payload, time and concurrency.
- Failure categories are stable application errors from `0127`, not message parsing.
- Policy is shared but operation metadata may choose different validated limits.
- Backpressure is explicit; unbounded queuing is not allowed.

## Requirements

1. Extract the repeated payload/timeout/error pipeline behind one adapter/policy layer consuming `0146` registry metadata.
2. Define validated config for default/per-operation timeout, max payload/input size and concurrency/queue bound.
3. Add deterministic behavior for saturation: bounded wait or typed rejection, never unbounded queue growth.
4. If a circuit breaker is used, define closed/open/half-open transitions, thresholds and reset timing with fake-clock tests.
5. Preserve remote typed/domain errors distinctly from local transport/timeout/invalid-payload failures.
6. Add table-driven tests for success, oversized input, timeout, peer unavailable, malformed response, saturation and recovery.
7. Register policy/config validation and focused tests in CI.

## Acceptance criteria

- [ ] MercurionAI and RDKit share one scientific RPC policy path.
- [ ] No scientific operation contains a local hard-coded timeout/payload/concurrency policy.
- [ ] In-flight work is bounded and saturation behavior is deterministic.
- [ ] Timeout/unavailable/overload/invalid-response/remote-error remain distinguishable.
- [ ] Metrics expose latency and failure/backpressure state without sensitive payloads.

## Validation

Run scientific adapter/policy tests with fake clock and fake ClientProxy, MercurionAI/RDKit contract tests, full Nest tests/E2E, strict typecheck, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an operation requires a new capacity/timeout decision beyond preserving current behavior and no approved production value exists; do not choose an arbitrary higher workload limit.

## Dependencies

- `0127`, `0129`, `0130` and `0146-define-typed-versioned-nats-contract-registry.md` must be `DONE`.

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
