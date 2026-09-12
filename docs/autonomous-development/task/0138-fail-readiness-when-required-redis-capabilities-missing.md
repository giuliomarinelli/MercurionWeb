# 0138 - Fail readiness when required Redis capabilities are missing

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-024`, based on `c27cc2444dafa77320f0abb9ac22ff49980dedaa`.
Clean identity and HEAD were verified before editing; the supplied SHA is the
clean `develop` base. Dependency 0137 is `DONE` at this base.
### Preflight
GitHub Actions CI run `34707670930` for the exact base SHA completed
successfully. No task-owned Angular, Nest, Tox21, Jest watcher, or other
workspace-consuming process was active. Browser validation is not applicable.
Local `npm ci` and `npm run ci:check` were not run.
### Preflight remediation
None.
### Summary
Added a typed `notify-keyspace-events` Redis capability policy requiring `E`,
`x`, and `g`, with structured non-secret diagnostics and a typed
`REDIS_REQUIRED_CAPABILITY_MISSING` error. The Redis adapter now owns reading
the server capability, startup/pub-sub initialization fails on missing or
unreadable capabilities, and `/health` revalidates the capability so runtime
loss makes the application unready. Added supported/superset and missing-flag
coverage plus Docker/Kubernetes manifest compatibility coverage. DATA
boundaries and session persistence were not changed.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_node` — passed.
- Focused Redis capability/readiness tests — 5 suites, 18 tests passed.
- `npm run build --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node` — passed after fixing the
  task test typing; 48 pre-existing warnings and zero errors.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are prohibited.
Exact feature-SHA GitHub Actions validation is coordinator-owned.
### Browser validation performed
_Not applicable._
### Commits
- `86d042f4` — `feat(redis): enforce required capabilities`.
- Documentation follow-up records the final task commit and push.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
