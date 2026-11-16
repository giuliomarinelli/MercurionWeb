# 0208 - Consolidate project Dockerfiles

- [x] DONE
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
`feature/QA-022`
### Preflight
Clean feature branch at base SHA `3375415ee03a75a124517181209924f6f86ae7c6`,
matching `origin/develop`. Exact base CI run `34729898017` completed
successfully. Repository-local `commit.gpgSign` is `false`; no task-owned
runtime was active before validation.
### Preflight remediation
None.
### Summary
Replaced the six duplicated Angular/Nest environment Dockerfiles with one
multi-stage Dockerfile per project. Each maintained file exposes explicit
`production`, `staging` and `test` targets, centralizes immutable dependency
and source stages, preserves the existing build configurations/assets,
non-root numeric identities, read-only-root assumptions, ports and standalone
exec-form commands, and keeps local development on the existing watch
commands. Updated local-staging, beta/prod release Compose and canonical CI
references to use exact targets. Removed all superseded environment
Dockerfiles, expanded the container contract checker with target and stale
reference validation, added CI smoke execution for every matrix entry, and
updated the environment contract test to inspect the canonical target file.

Before matrix: Angular production/staging/testing used separate Node build
stages and nginx runtime configs; Nest production/staging/test used separate
Node dependency/build/runtime files, with staging assets and test-only config
assets/tests. All six used the same root workspace lockfile contract, runtime
users `10101:10101` / `10001:10001`, ports `3497` / `8098`, and standalone
commands. After matrix: each project has shared dependency, source, build and
runtime foundations with named environment targets; only the documented
configuration, assets and nginx config vary.
### Task-specific validation performed
- `node --check` for changed container scripts and `git diff --check` —
  passed.
- `npm run ci:containers` — passed, including immutable lockfile drift
  rejection, six-target declaration checks and stale superseded-path checks.
- `docker compose ... config --quiet` for local-staging, beta release and
  production release — passed.
- Clean-cache `docker build --pull --no-cache` matrix passed for Angular
  `production`, `staging`, `test` and Nest `production`, `staging`, `test`.
  The first Nest production attempt hit a transient registry `ECONNRESET`;
  the bounded retry passed.
- `scripts/check-container-runtime.mjs` and
  `scripts/smoke-container-runtime.mjs` passed for all six targets. Images
  retained the expected non-root users, ports and exec-form commands.
- Nest test target ran all 148 suites and 453 tests successfully.
- Focused Nest environment contract test passed (17 tests).
- Final `git diff --check` and tracked-file status passed; generated output
  was removed before handoff.
### Full pre-merge CI-parity validation
Complete clean-install/aggregate validation remains owned by GitHub Actions on
the exact pushed feature SHA; local `npm ci` and `npm run ci:check` were not
run.
### Browser validation performed
Canonical runtime startup was attempted in the required Tox21 -> Nest ->
Angular order with live execution handles and `http://localhost:8888`. The
Angular shell returned HTTP 200 in two consecutive rounds and the
`/molecules/detail/1` lazy route loaded its document and lazy chunks through
the nginx edge. The unchanged Nest watch runtime reported:
`EPERM: operation not permitted, copyfile
'MercurionWebNode/src/app_modules/notification/email-templates/layouts' ->
'MercurionWebNode/dist/src/app_modules/notification/email-templates/layouts'`.
Consequently backend health and WebSocket requests returned 502 and the lazy
route displayed its existing molecule-load error; no Angular asset or
serving failure was observed. Tox21, Nest and Angular task-owned processes
were stopped and no matching runtime process remained.
### Commits
`33d4375e` — `qa: consolidate project Dockerfiles`
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
