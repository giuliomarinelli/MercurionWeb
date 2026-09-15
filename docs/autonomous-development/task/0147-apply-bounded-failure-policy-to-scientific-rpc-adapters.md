# 0147 - Apply one bounded failure policy to scientific RPC adapters

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-033`, based on `f14346645bb91fec94c650616c117ea0da3cd42b`.
### Preflight
- Session profile matched the inherited GPT-5.6 Luna, Medium reasoning, default 300k context profile; no model, reasoning, or context override was supplied.
- `git rev-parse HEAD`, `git rev-parse develop`, and `git rev-parse origin/develop` all resolved to `f14346645bb91fec94c650616c117ea0da3cd42b`; branch was `feature/BE-033` and the worktree was clean before the task mutation. Effective repository-local `commit.gpgSign=false`.
- `npm run autonomous:plan --silent` resolved this task as `READY` with hard dependencies `0127`, `0129`, `0130`, and `0146`; the prior dependency-skip note was stale.
- Inspected `../MercurionTox21` read-only. Its current subjects and handlers remain compatible with the 0146 registry; no sibling files were modified.
- No owned Angular, Nest, Tox21, or test-watcher process was started by this task.
### Preflight remediation
None.
### Summary
Blocked by the explicit recipe stop condition. The current repository preserves the existing 3000 ms scientific RPC timeout and `APP_MAX_NATS_PAYLOAD_BYTES` payload limit, but defines no approved scientific in-flight concurrency or queue bound. Implementing the required bounded saturation policy would therefore invent a production capacity value, which is prohibited. No application implementation was changed.
### Task-specific validation performed
No task-specific code validation was run because implementation was stopped before code changes. Baseline inspection used `npm run autonomous:plan --silent`; no prohibited `npm ci` or `npm run ci:check` command was run.
### Full pre-merge CI-parity validation
Not applicable; no implementation commit was produced.
### Browser validation performed
_Not applicable._
### Commits
`4a561296bbd16a1ec59eb9bab705eb242db6e2bc` — blocker status and execution notes; no application implementation changes.
### Merge / CI
Not merged. Feature branch is preserved for the missing production-capacity decision.
### Rollback
_Not applicable._
### Blocker / human decision required
Approve a scientific RPC concurrency and bounded-queue policy (including validated production values and whether saturation rejects immediately or waits for a bounded interval). Until that decision exists, do not implement or infer a capacity limit.
