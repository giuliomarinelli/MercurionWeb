# 0135 - Implement deterministic graceful shutdown

- [ ] DONE
- [ ] BLOCKED

## Objective

Make SIGTERM, SIGINT and fatal process errors trigger one idempotent bounded shutdown sequence that stops intake, closes application transports/infrastructure and exits with the correct status instead of only logging the event.

Source: `BE-021` in Series `0001`.

## Context

`main.ts` currently installs `unhandledRejection` and `uncaughtException` handlers that only write to console. There is no explicit shutdown coordination for HTTP/Fastify, Socket.IO, Nest NATS microservices, Redis, TypeORM or other application resources. Container/process termination therefore has no tested drain deadline or completion semantics.

## Relevant files and modules

- bootstrap configurators from `0134`
- `MercurionWebNode/src/main.ts`
- Nest application lifecycle hooks
- Socket.IO/NATS/Redis/TypeORM owners
- health/readiness endpoints
- process/shutdown tests

## In scope

- Introduce one shutdown coordinator with explicit state (`running`, `draining`, `closed`).
- Handle SIGTERM and SIGINT and integrate fatal `uncaughtException`/`unhandledRejection` policy.
- Mark the instance unready/stop new intake before closing downstream resources.
- Close Nest HTTP app, WebSocket transport, microservices and infrastructure clients through their canonical owners.
- Enforce a configurable hard shutdown timeout and emit structured lifecycle diagnostics.
- Make repeated/concurrent shutdown signals idempotent.

## Out of scope

- Do not add deployment-specific termination grace values without validated config.
- Do not attempt infinite draining.
- Do not swallow fatal errors and continue serving traffic.
- Do not modify external infrastructure.

## Decisions already made

- Graceful shutdown is bounded and observable.
- Fatal process failures terminate non-zero after the shutdown attempt.
- Normal SIGTERM/SIGINT follow the documented clean-exit policy.
- One owner coordinates shutdown; individual modules expose close/drain capabilities but do not install competing process handlers.

## Requirements

1. Enable/use Nest lifecycle shutdown hooks where appropriate and add explicit coordination for resources not covered automatically.
2. Define shutdown ordering: reject/readiness-down first, then stop intake, then drain/close transports and infrastructure.
3. Await every asynchronous close operation and collect/report failures without abandoning cleanup of later resources.
4. Race the graceful sequence against a configurable timeout; force termination only after recording timeout diagnostics.
5. Ensure fatal handlers cannot recursively trigger multiple shutdowns.
6. Add fake-resource tests asserting call order, idempotence, timeout and exit-code semantics.
7. Add an integration test that starts an application context, requests shutdown and proves no owned handle remains active.

## Acceptance criteria

- [ ] SIGTERM/SIGINT execute one bounded graceful shutdown.
- [ ] HTTP/WebSocket/NATS/Redis/DB owned resources are closed or explicitly proven Nest-managed.
- [ ] Fatal errors result in non-zero termination after cleanup attempt.
- [ ] Repeated signals do not double-close resources.
- [ ] Shutdown timeout and cleanup failures are observable.

## Validation

Run shutdown coordinator tests, application-context integration test, E2E/bootstrap tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a required resource has no deterministic ownership/close API after the earlier provider/module ownership tasks and resolving that ownership exceeds this task.

## Dependencies

- `0134-decompose-nest-bootstrap-into-configurators.md` must be `DONE`.
- Provider ownership from `0118`/`0119` must remain canonical.

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
