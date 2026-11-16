# 0216 - Align deployment probes and lifecycle

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Align application health endpoints, Compose/Kubernetes probes and termination settings so readiness means capable of serving, liveness detects only a stuck process, startup covers bounded bootstrap and shutdown drains without losing accepted requests.

Source: `QA-030` in Series `0001`.

## Context

Existing deployment probes/lifecycle settings are not tied consistently to real dependency readiness or the graceful-shutdown sequence. Earlier tasks establish typed configuration, Redis capability readiness and a bounded Nest shutdown coordinator. This task defines one health contract and projects it into every active deployment overlay without making transient external dependency failure trigger restart storms or allowing traffic during startup/draining.

## Relevant files and modules

- Nest health/readiness controllers/services
- shutdown coordinator from `0135`
- Redis capability check from `0138`
- PostgreSQL, Redis, NATS and other required infrastructure adapters
- canonical deployment schema/overlays from `0215`
- active Compose health checks
- `k8s/` startup/readiness/liveness probes and pod lifecycle settings
- runtime/integration tests and CI deployment fixtures

## In scope

- Define typed `startup`, `readiness` and `liveness` semantics with bounded checks.
- Classify hard serving dependencies versus optional/degraded capabilities from existing application contracts.
- Make readiness false during bootstrap, required dependency/capability loss and graceful drain.
- Keep liveness independent of transient downstream outages and focused on process/event-loop deadlock or unrecoverable internal failure.
- Add a startup probe budget matching measured worst-case safe bootstrap.
- Align pre-stop/drain ordering and termination grace with the bounded shutdown timeout.
- Project the same endpoint/timing contract into Compose and Kubernetes overlays.
- Add integration and manifest-policy tests for healthy, degraded, failed and terminating states.

## Out of scope

- Do not make every external integration a liveness dependency.
- Do not return ready before required initialization/migrations/capability checks complete.
- Do not set arbitrary probe delays/timeouts solely to suppress observed flakes.
- Do not let probes mutate dependencies or repair infrastructure.
- Do not deploy or test against production services.

## Decisions already made

- Readiness gates new traffic; it is false whenever the instance cannot satisfy its mandatory serving contract.
- Liveness answers whether the process should be restarted and does not fail merely because a recoverable dependency is unavailable.
- Startup protects legitimate bounded initialization without weakening steady-state checks.
- Graceful termination marks unready before intake stops, drains within the configured shutdown timeout and has a larger orchestrator grace budget.
- Probe endpoints expose minimal safe status/reason codes and no credentials/internal sensitive detail.

## Requirements

1. Inventory current health endpoints/probes and classify each infrastructure dependency as mandatory, optional/degraded or startup-only based on implemented contracts.
2. Implement one typed health-state aggregator with separate startup/readiness/liveness presenters and bounded per-check timeouts.
3. Integrate database connectivity, required Redis capabilities from `0138`, required NATS/runtime capabilities and other proven hard dependencies into readiness only.
4. Tie the shutdown coordinator to readiness/intake so a terminating instance becomes unready before connections are drained.
5. Measure normal/cold bootstrap and configure startup failure/period budgets with documented margin; do not reuse liveness as startup control.
6. Set termination grace and any `preStop` behavior consistently with the application shutdown timeout, including signal forwarding from `0207` images.
7. Generate/validate matching Compose/Kubernetes health settings from `0215` and reject conflicting endpoint, port or timing values.
8. Add tests for healthy startup, slow-but-bounded startup, required dependency loss/recovery, optional dependency degradation, liveness stability and in-flight request completion on termination.
9. Register health-contract and manifest-policy tests in canonical CI using isolated services.

## Acceptance criteria

- [ ] Startup, readiness and liveness have distinct documented/tested semantics.
- [ ] Traffic is not accepted before mandatory capabilities are ready or while the instance is draining.
- [ ] Recoverable external dependency loss does not create a liveness restart loop.
- [ ] Startup and termination timing budgets derive from measured/bootstrap-shutdown contracts.
- [ ] Compose/Kubernetes endpoints, ports and timings match the canonical deployment model.
- [ ] A termination integration test completes accepted in-flight work within grace and closes owned resources.

## Validation

Run health-state unit/integration tests with isolated dependencies, simulate required and optional dependency loss/recovery, exercise slow startup and SIGTERM with an in-flight request, validate all rendered Compose/Kubernetes probe policies, then run repository-wide CI parity.

## Browser validation

No browser UI validation is required. Verify health endpoints and application traffic through isolated integration/runtime clients; use `http://localhost:8888` only for the canonical end-to-end in-flight request if that is the existing system-test path.

## Stop conditions

Mark `BLOCKED` if a dependency's hard/optional serving classification or the infrastructure termination-grace budget is not defined by existing architecture/deployment policy. Do not guess by making every dependency either mandatory or ignored.

## Dependencies

- `0135-implement-deterministic-graceful-shutdown.md` and `0138-fail-readiness-when-required-redis-capabilities-missing.md` must be `DONE`.
- `0147-apply-bounded-failure-policy-to-scientific-rpc-adapters.md` should define scientific dependency degradation semantics.
- `0207-harden-container-runtime-contracts.md` and `0215-centralize-deployment-configuration.md` must be `DONE`.

## Implementation notes

Health checks are control-plane contracts, not verbose diagnostics. Keep response work cheap and bounded; expose deeper dependency detail through structured observability rather than public probe bodies.

## Execution notes

### Feature branch

`feature/QA-030`, based on `f09a2fcad6823c557eef86b5365162e5c9694136`.
The branch was clean, matched `develop` and `origin/develop`, and no remote
`feature/QA-030` ref existed before the blocking diagnostic commit.

### Preflight

The supplied exact base-SHA Actions run `35533139087` completed successfully
with `Required gate` green through the metadata path. Hard dependencies `0135`
(`BE-021`), `0138` (`BE-024`), `0207` (`QA-021`) and `0215` (`QA-029`) are
marked `DONE`. Repository-local `commit.gpgSign` is `false`. No task-owned
Angular, Nest, Tox21 or test-watcher process was active. No browser/runtime
validation was started because this recipe declares no browser UI validation
and the stop condition was reached before implementation.

### Preflight remediation

None. Local `npm ci` and `npm run ci:check` were not run.

### Summary

Blocked by the recipe's explicit stop condition before implementation. The
canonical deployment schema contains only an undifferentiated `dependsOn`
list (`web-node` depends on Redis, NATS, PostgreSQL and Meilisearch); it has no
hard/optional/degraded serving classification. The application health path
currently gates readiness with `ReadinessService` and the required Redis
capability check only, while no existing architecture/deployment policy
defines the serving classification or bounded checks for the other declared
dependencies. Choosing those classifications would require guessing.

The shutdown contract defines `APP_SHUTDOWN_TIMEOUT_MS` with a 10-second
default and `ShutdownCoordinator` uses the same default, but the active
application Compose overlays do not define `stop_grace_period` and the
`mercurion-web-node` Kubernetes deployment does not define
`terminationGracePeriodSeconds` or a `preStop` drain policy. The isolated
Meilisearch manifest's 60-second grace value is not an application
termination policy. Therefore the required larger infrastructure grace budget
cannot be derived from existing policy without guessing.

No health, deployment, or lifecycle implementation was added.

### Task-specific validation performed

- `node scripts/check-deployment-config.mjs` — passed: canonical schema,
  four overlays and 18 active artifacts validated deterministically.
- `git diff --check` — passed.

### Full pre-merge CI-parity validation

Not run locally by policy. Exact feature-SHA CI is coordinator-owned.

### Browser validation performed

Not applicable; no browser UI validation is required and no application URL
was opened.

### Commits

Pending diagnostic commit for the explicit stop-condition block.

### Merge / CI

Not applicable; the preserved feature branch is blocked before integration.

### Rollback
_Not applicable._

### Blocker / human decision required

Define, in existing architecture/deployment policy, the hard versus
optional/degraded serving dependencies and the measured application shutdown
timeout plus larger Compose/Kubernetes termination-grace/pre-stop budget.
Until those decisions exist, this recipe must not guess probe semantics or
deployment timing.
