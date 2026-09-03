# 0138 - Fail readiness when required Redis capabilities are missing

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Turn Redis protocol prerequisites such as keyspace notifications from advisory warnings into machine-verified startup/readiness capabilities so the application never serves session traffic with an unsupported Redis configuration.

Source: `BE-024` in Series `0001`.

## Context

`PubSubService` currently reads `notify-keyspace-events` and logs a warning when the expected flags are absent. Both local Docker and Kubernetes Redis configuration currently request `Exg`, so the capability is an intentional part of the protocol rather than an optional optimization.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/redis/services/pub-sub.service.ts`
- `MercurionWebNode/src/app_modules/redis/redis.module.ts`
- health/readiness controllers/services
- session/socket consumers of Redis pub/sub/key events
- `docker_sl/docker-compose.yml`
- `k8s/beta/redis-deploy.yaml`
- Redis tests

## In scope

- Define the exact Redis capabilities required by the session/pub-sub protocol.
- Probe those capabilities deterministically during startup/readiness.
- Keep the application unready or abort startup when a mandatory production/staging capability is absent.
- Make capability results observable with structured diagnostics.
- Add positive/negative tests for supported and unsupported `notify-keyspace-events` configurations.
- Ensure loss of required runtime capability is reflected by readiness if it can change after startup.

## Out of scope

- Do not mutate managed Redis server configuration automatically from the application.
- Do not weaken the pub/sub protocol to make missing capabilities acceptable without an approved architecture change.
- Do not redesign session persistence; DATA tasks own that.

## Decisions already made

- Required Redis capabilities are contractual dependencies, not warnings.
- Readiness means the application can correctly execute its session/pub-sub protocol.
- Production/staging must not accept traffic when a mandatory capability is absent.

## Requirements

1. Express required flags/capabilities as typed Redis infrastructure policy.
2. Validate the actual server configuration through the Redis adapter at initialization/readiness.
3. Fail with a typed infrastructure/readiness error that states the missing capability without exposing secrets.
4. Test `Exg` and equivalent supersets as success and missing required flags as failure.
5. Verify local Docker and Kubernetes manifests satisfy the asserted contract.
6. Integrate the check with the canonical health/readiness path used by deployment/runtime validation.

## Acceptance criteria

- [ ] Missing required Redis capabilities prevent ready traffic.
- [ ] Correct/superset capability configuration passes deterministically.
- [ ] The application never silently degrades the session/pub-sub protocol after a warning.
- [ ] Deployment manifests are covered by a configuration compatibility test/fixture.
- [ ] Diagnostics identify the capability mismatch clearly.

## Validation

Run Redis capability/readiness tests, application bootstrap/E2E tests with supported and unsupported Redis fixtures, build and canonical CI-parity gates.

## Browser validation

Not applicable; readiness can be verified through the canonical health endpoint in integration/runtime tests.

## Stop conditions

Mark `BLOCKED` if the active protocol does not actually require the currently documented keyspace events and deciding whether to retain that dependency requires a new architecture decision.

## Dependencies

- `0137-introduce-typed-redis-key-and-ttl-contracts.md` should be `DONE`.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0137` (BE-023, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY -> 0137 BE-023 SKIPPED_DEPENDENCY -> 0138 BE-024 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
