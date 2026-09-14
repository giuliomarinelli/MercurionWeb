# 0135 - Implement deterministic graceful shutdown

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-021` at base `19c45ee7955c197b659602f18640b0908138bfa7`; branch identity
and clean worktree were verified before edits.
### Preflight
Verified task identity `0135` / Source `BE-021`, and hard prerequisites
`0118`, `0119`, and `0134` are marked `DONE`. The supplied base equals local
`develop`, `origin/develop`, and `feature/BE-021`. GitHub Actions run
`34704522404` for the exact base SHA completed successfully with conclusion
`success`. No task-owned Angular, Nest, Tox21, or test-watcher process was
active; the existing Chrome DevTools MCP processes were not workspace
processes. No browser/runtime validation was applicable.
### Preflight remediation
None. `npm ci` and `npm run ci:check` were not run locally.
### Summary
Added a single idempotent `ShutdownCoordinator` with `running`/`draining`/
`closed` state, ordered readiness drain then Nest application closure, bounded
timeout, structured lifecycle diagnostics, continued cleanup after individual
resource failures, and shared in-flight shutdown promise for repeated signals.
SIGTERM/SIGINT now use the coordinator; fatal rejection/exception handlers
attempt the same cleanup and set a non-zero exit code. Added validated
`APP_SHUTDOWN_TIMEOUT_MS` with a 10-second default. Health readiness returns
HTTP 503 after draining. Redis, Pub/Sub, and Socket.IO adapter Redis clients
now close through their existing canonical owners; Nest-managed HTTP,
WebSocket, NATS, TypeORM, and module resources close through `app.close()`.
### Task-specific validation performed
Passed:

- `npm test --workspace mercurion_web_node -- --runInBand shutdown`:
  2 suites, 4 tests passed, including application-context shutdown.
- Focused backend Jest set covering shutdown, health, config schema,
  bootstrap composition, app module, and provider ownership: 6 suites,
  28 tests passed.
- `npm run typecheck --workspace mercurion_web_node`: passed.
- `npm run build --workspace mercurion_web_node`: passed.
- `npm run lint --workspace mercurion_web_node -- --quiet`: passed with the
  existing 48 unsafe-argument warnings and no errors. The full lint command
  also passed with the same warnings.
- `git diff --check`: passed.

The coordinator tests assert ordering, concurrent idempotence, cleanup after a
failure, timeout diagnostics, and closed Nest application context.
### Full pre-merge CI-parity validation
Not run locally by policy. Exact-SHA full CI evidence is owned by the
coordinator after feature publication.
### Browser validation performed
_Not applicable._
### Commits
`c13dbc811091cbf75ad997d452832ca001ca3259` -
`feat(BE-021): implement deterministic graceful shutdown`
### Merge / CI
Feature CI pending coordinator observation after push.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
