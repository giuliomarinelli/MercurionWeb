# 0207 - Harden container runtime contracts

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Make every repository-built application image start successfully as a non-root user with an explicit standalone runtime command, correct filesystem/port ownership and a deterministic smoke test.

Source: `QA-021` in Series `0001`.

## Context

The audited runtime containers execute as root, and the Nest production/staging Dockerfiles do not declare a `CMD`, so those images depend on an external Compose/Kubernetes override to start. An application image must define its own runnable contract and must not require root merely because build/runtime paths were not prepared correctly. This task hardens each existing target before `0208` consolidates the duplicated Dockerfiles.

## Relevant files and modules

- `MercurionWebNode/Dockerfile*`
- `MercurionWebNg/Dockerfile*`
- repository-built nginx/PostgreSQL helper images under `docker_sl/` where they contain custom runtime logic
- `docker_md/docker-compose.yml`
- `docker_sl/docker-compose.yml` and environment-specific Compose files
- `k8s/` workload/security-context manifests
- application start scripts and runtime asset paths
- container smoke-test scripts and CI workflow

## In scope

- Inventory every custom runtime image and its effective user, command, port and writable paths.
- Add an explicit `ENTRYPOINT`/`CMD` contract to every application image, including Nest production and staging.
- Create/use a dedicated numeric non-root runtime identity and assign only required files/directories.
- Make application ports and filesystem paths compatible with non-root execution.
- Remove reliance on orchestration command overrides for basic standalone startup.
- Add image metadata and a bounded standalone smoke test per runtime target.
- Align Compose/Kubernetes user/security context with the image contract without weakening it.

## Out of scope

- Do not grant broad capabilities, privileged mode, host filesystem access or world-writable permissions to avoid ownership work.
- Do not treat the default behavior of third-party service images as repository-owned code unless a custom derived image changes it.
- Do not add production secrets or production connectivity to smoke tests.
- Do not redesign readiness/liveness semantics; `0216` owns deployment probes and lifecycle.
- Do not deploy any image.

## Decisions already made

- Repository-built application runtimes execute as non-root.
- Every final application image is runnable without a Compose/Kubernetes command override.
- Runtime identity uses stable numeric UID/GID semantics so orchestrators can enforce it.
- Writable locations are explicit and minimal; application source/config remains read-only where practical.
- Smoke tests use isolated, non-production configuration and prove the image process contract.

## Requirements

1. For each final runtime target, record effective user/group, entrypoint/command, exposed/listening port, read-only assets and required writable paths.
2. Add a dedicated non-root user/group in repository-built images and copy/chown files deliberately, avoiding recursive blanket permission changes.
3. Declare an exec-form `ENTRYPOINT` and/or `CMD` that starts the intended application and forwards signals correctly; Nest staging/production must no longer depend on an external command.
4. Bind to non-privileged ports or use a safe image-specific mechanism that does not grant broad runtime capability.
5. Configure temporary/cache/upload paths explicitly and prove the process runs with a read-only root filesystem where the application contract permits it.
6. Align Compose/Kubernetes `user`, `runAsNonRoot`, `runAsUser`, `runAsGroup`, privilege escalation and capability settings with the image identity.
7. Add a standalone smoke test that launches each target without a command override, verifies the expected process/port or bounded health signal, sends termination and observes a clean exit.
8. Inspect the final image configuration and fail CI if effective user is root or the runtime command is missing.

## Acceptance criteria

- [ ] Every repository-built application image declares a stable non-root runtime user.
- [ ] Nest production and staging images have an explicit standalone command.
- [ ] No application image needs privileged mode, broad capabilities or world-writable source paths.
- [ ] Compose/Kubernetes security contexts agree with the image UID/GID and port contract.
- [ ] Each final target starts without an orchestration command override and handles termination signals.
- [ ] Canonical CI fails when a final image reverts to root or loses its runtime command.

## Validation

Build every final target, inspect image user/entrypoint/command metadata, run each image in isolated smoke configuration with no command override, assert non-root process identity and expected port/health behavior, terminate it, then run repository-wide CI parity.

## Browser validation

For the Angular/nginx runtime image, use `http://localhost:8888` through the canonical development edge only if the task changes browser-serving behavior; verify the shell/static assets load and no relevant console/network errors appear. Nest-only image hardening does not require browser validation.

## Stop conditions

Mark `BLOCKED` if a required runtime dependency demonstrably requires root or a privileged capability and replacing/reconfiguring it needs an unresolved infrastructure decision; do not silently grant privilege.

## Dependencies

- `0206-make-container-builds-lockfile-reproducible.md` must be `DONE`.
- `0135-implement-deterministic-graceful-shutdown.md` must define the Nest signal-handling contract consumed by smoke tests.

## Implementation notes

Test the final image metadata and the running process. A `USER` line in an intermediate stage is not evidence that the delivered target is non-root or runnable.

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
_Not started / as applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0135` (BE-021, SKIPPED_DEPENDENCY), `0206` (QA-020, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0206 QA-020 SKIPPED_DEPENDENCY -> 0207 QA-021 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
