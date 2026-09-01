# 0208 - Consolidate project Dockerfiles

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the six near-duplicate Angular and Nest environment Dockerfiles with one reusable multi-stage Dockerfile per project whose explicit targets preserve development, test, staging and production behavior.

Source: `QA-022` in Series `0001`.

## Context

`MercurionWebNg` and `MercurionWebNode` each maintain `Dockerfile`, `Dockerfile.staging` and `Dockerfile.test` with substantially duplicated install/build instructions. Tasks `0206` and `0207` first establish immutable dependency installation and hardened runtime contracts. This task then centralizes shared stages so environment differences are selected through named build targets and validated configuration, not copied instruction forks.

## Relevant files and modules

- `MercurionWebNg/Dockerfile`
- `MercurionWebNg/Dockerfile.staging`
- `MercurionWebNg/Dockerfile.test`
- `MercurionWebNode/Dockerfile`
- `MercurionWebNode/Dockerfile.staging`
- `MercurionWebNode/Dockerfile.test`
- project `.dockerignore` files
- `docker_md/docker-compose.yml`
- `docker_sl/docker-compose.yml` and `docker_sl/local-staging/docker-compose.yml`
- release Compose/Kubernetes build references
- container build/smoke matrix in canonical CI

## In scope

- Inventory the effective stages, arguments, commands and artifact differences among all six files.
- Create one Angular and one Nest multi-stage Dockerfile with shared dependency/build foundations and explicit named targets.
- Express legitimate environment differences through build targets, runtime configuration and narrowly scoped build arguments.
- Update all in-repository build references to the canonical file plus target.
- Delete superseded Dockerfiles after reference checks prove they are unused.
- Preserve the lockfile, non-root, standalone-command and signal contracts established by `0206`/`0207`.
- Build and smoke-test every supported target in CI.

## Out of scope

- Do not collapse Angular and Nest into one cross-project Dockerfile.
- Do not bake runtime environment secrets or production configuration into reusable image layers.
- Do not use an unconstrained build argument to choose arbitrary shell commands.
- Do not retain wrapper Dockerfiles containing copied instruction bodies.
- Do not change application behavior or deploy images as part of consolidation.

## Decisions already made

- There is exactly one maintained Dockerfile per Angular/Nest project.
- Development, test, staging and production are explicit named targets where their runtime contract differs.
- Shared dependency/build stages are defined once and inherited by targets.
- Environment configuration remains external/runtime-owned unless compilation genuinely requires a non-secret build input.
- The final targets retain immutable installs, non-root identity and explicit commands.

## Requirements

1. Produce a before matrix of the six Dockerfiles covering base image, install command, build command, copied assets, user, port and runtime command.
2. Implement one project-specific multi-stage file for Angular and one for Nest, naming targets clearly enough for Compose/CI use.
3. Centralize common dependency and build stages without copying large instruction blocks between targets.
4. Preserve only proven target-specific behavior and document why each target differs; eliminate accidental staging/test/prod drift.
5. Update Compose, local-staging, release and other repository references to use the canonical path and exact target.
6. Remove the four superseded environment-specific files and add a static reference check so stale paths cannot remain in manifests/scripts/docs.
7. Build every supported target from clean cache and run the runtime smoke contract from `0207` where the target is runnable.
8. Add the target matrix to canonical CI with diagnostics that identify the failing project/target.

## Acceptance criteria

- [ ] Angular has one maintained multi-stage Dockerfile and Nest has one.
- [ ] No superseded staging/test Dockerfile or stale reference remains.
- [ ] Shared installation/build instructions are defined once per project.
- [ ] Every supported environment maps to an explicit validated target/configuration.
- [ ] All final targets retain lockfile-reproducible, non-root and standalone runtime behavior.
- [ ] Clean CI builds and smoke-tests the complete target matrix.

## Validation

Compare the before/after target matrix, search the repository for deleted Dockerfile paths, build all targets without cache, run applicable standalone smoke tests and manifest/config checks, verify tracked files remain unchanged, then run repository-wide CI parity.

## Browser validation

For each Angular target whose serving/runtime layer changes, exercise the application shell and representative lazy route through `http://localhost:8888` in the canonical runtime and inspect network/console behavior. Nest target consolidation alone does not require direct browser validation.

## Stop conditions

Mark `BLOCKED` if two environment Dockerfiles encode a material product/deployment difference whose intended behavior cannot be determined from manifests or existing documentation; do not choose one silently.

## Dependencies

- `0206-make-container-builds-lockfile-reproducible.md` must be `DONE`.
- `0207-harden-container-runtime-contracts.md` must be `DONE`.

## Implementation notes

Consolidation is successful only if the matrix proves semantic parity. Fewer files with opaque conditional shell logic would preserve the same maintenance problem in a harder-to-test form.

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
