# 0202 - Complete the canonical GitHub Actions CI pipeline

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Complete the canonical `.github/workflows/ci.yml` established by task `0008` into a dependency-aware GitHub Actions pipeline for pull requests and pushes to `develop`, executing the same repository gates used by local autonomous preflight and publishing useful diagnostics/artifacts.

Source: `QA-016` in Series `0001`.

## Context

Task `0008` already establishes `npm ci` plus `npm run ci:check` as the canonical local/CI interface and requires a GitHub Actions workflow. Subsequent tasks add PostgreSQL/Redis integration tests, Playwright, coverage, lint, architecture, schema/contract and bundle gates. This task is not permission to replace that contract with a second CI implementation: it finishes the workflow topology so expensive jobs are separated, prerequisites block downstream work and every gate remains backed by the same root scripts used locally.

## Relevant files and modules

- `.github/workflows/ci.yml`
- root `package.json`/workspace scripts from the permanent baseline and `0008`
- Angular/Nest package scripts
- PostgreSQL/Redis/NATS test-service requirements
- Playwright/system-test configuration
- schema/contract/static/coverage/bundle gates
- Node/npm version/toolchain configuration

## In scope

- Run on pull requests targeting `develop` and pushes to `develop` with appropriate path/event behavior.
- Use the repository-pinned Node/npm toolchain and npm dependency cache.
- Separate prerequisite/static, unit, integration/E2E, build, browser/system and aggregate-result jobs where that improves isolation/parallelism.
- Ensure lint/typecheck/static/schema/contract prerequisites fail before dependent expensive jobs when appropriate.
- Provide disposable PostgreSQL/Redis/NATS services only to jobs that need them.
- Run Playwright and same-version system tests after required builds/services are ready.
- Publish coverage, test reports, Playwright traces and relevant build/static artifacts on success/failure as appropriate.
- Add concurrency cancellation for superseded PR revisions without cancelling the validation of a `develop` merge because a newer unrelated run starts.
- Produce one final aggregate required result representing all mandatory quality gates.

## Out of scope

- Do not duplicate gate implementation as ad-hoc workflow shell snippets when a canonical npm script exists.
- Do not use production secrets/services for CI tests.
- Do not skip a failed prerequisite and still report the aggregate gate green.
- Do not create a second workflow with overlapping quality semantics unless GitHub limitations make a separate reusable workflow necessary and documented.
- Do not silently make expensive mandatory gates optional to reduce runtime.

## Decisions already made

- `npm ci` and root canonical scripts are the source of truth for both local preflight and Actions.
- PR and `develop` push validation are mandatory; the exact merge SHA must receive a truthful CI result.
- Broken prerequisites block dependent jobs.
- CI services use safe deterministic test configuration and disposable data.
- The workflow exposes an aggregate required status suitable for branch protection.

## Requirements

1. Inventory every mandatory gate introduced by tasks through `0204` and map it to a root npm script used identically locally and in Actions.
2. Pin/setup the supported Node/npm version and configure dependency caching without caching mutable build/test results as truth.
3. Create a fast prerequisite job for dependency integrity, lint, typecheck, architecture/static, schema/contract checks as appropriate.
4. Run Angular unit and Nest unit suites in isolated jobs with test/coverage reporting.
5. Run real PostgreSQL/Redis integration and Nest E2E jobs with only their required service containers and deterministic health checks.
6. Build Angular/Nest artifacts and enforce bundle/generated-artifact cleanliness gates.
7. Run Playwright browser E2E and then the same-version system test with required artifacts/runtime dependencies.
8. Configure `needs` so a failed prerequisite prevents meaningless downstream jobs while the final aggregate still reports failure clearly.
9. Upload bounded useful diagnostics: coverage, JUnit/test reports if generated, Playwright traces/screenshots on failure and build/bundle stats as required.
10. Configure PR concurrency by branch/head revision and document which CI status should be required by branch protection.

## Acceptance criteria

- [ ] Pull requests and pushes to `develop` execute the complete mandatory CI policy.
- [ ] Local autonomous preflight and GitHub Actions invoke the same canonical root gate definitions.
- [ ] Failed prerequisites block dependent jobs and the final aggregate result is red.
- [ ] Required test services are disposable and use no production secrets.
- [ ] Coverage/test/Playwright/build diagnostics are available from failed runs where relevant.
- [ ] Superseded PR revisions can be cancelled without hiding the status of the exact merge SHA on `develop`.
- [ ] One documented aggregate CI status is suitable for branch protection.

## Validation

Validate workflow syntax, run all root CI constituents locally, exercise the workflow on the feature branch/PR including at least one controlled failing gate if practical, verify job dependency/final aggregate behavior and artifact upload, then restore green CI parity.

## Browser validation

The workflow itself is not browser UI. Its Playwright/system jobs execute the browser validations defined by `0195` and `0197` through `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if GitHub-hosted runner networking cannot reproduce the canonical nginx/system topology or a required test service cannot run safely in Actions without an infrastructure decision; do not silently omit that mandatory gate.

## Dependencies

- Hard: `0008-enforce-nest-graphql-schema-drift-check.md` is the authoritative CI contract and must be `DONE`.
- Hard: QA tasks `0187`–`0201` should have registered their executable gates before final pipeline wiring.
- Advisory: `0203`/`0204` must be added to the same canonical aggregate when they are completed later.

## Implementation notes

Keep business logic in repository scripts, not YAML. The workflow should orchestrate dependency order, services, caching and artifacts; `npm run ci:check` and its granular constituents define what “green” means.

## Execution notes

### Feature branch
`feature/QA-016`, based on `7b8e06d5a29552177852ef9871af482f4efd250d`.
The branch was clean and exactly matched the supplied `develop` SHA before
implementation. No remote feature ref existed before the task commit.

### Preflight
Passed unchanged preflight. Exact base SHA
`7b8e06d5a29552177852ef9871af482f4efd250d` had successful GitHub Actions run
34723183369 with Ubuntu, Windows and `Required gate` green. Hard dependency
0008 and applicable completed QA gates 0187-0190 and 0199-0201 were DONE;
0191 and 0193-0198 were SKIPPED_DEPENDENCY and therefore did not register
service/browser/coverage gates for this pipeline. Task 0192 remained pending
and has no registered executable gate used by this recipe. No workspace
Angular/Nest/test watcher process was active. Local `npm ci` and
`npm run ci:check` were not run.

### Preflight remediation
None.

### Summary
Completed `.github/workflows/ci.yml` with exact-SHA classifier preservation,
full-by-default manual dispatch, PR/develop/feature triggers, PR-only
supersession cancellation, pinned Node 22.16.0/npm 10.9.2 setup-node caching,
cross-platform prerequisite/static jobs, dependency-gated Angular/Nest unit
and E2E jobs, isolated build artifacts, bounded diagnostics, and the stable
`Required gate`. No unavailable PostgreSQL/Redis/NATS/browser/system
infrastructure was invented for dependency tasks that are not DONE.

### Task-specific validation performed
Passed:
- workflow YAML parsed with the available `yaml` parser;
- `npm run ci:validate:autonomous`;
- `git diff --check`;
- `npm run ci:lint`;
- `npm run ci:typecheck`;
- `npm run ci:graphql`;
- `npm run ci:static`;
- `npm run ci:test:angular`;
- `npm run ci:test:nest` (148 suites, 455 tests);
- `npm run ci:test:nest:e2e` (3 tests);
- `npm run ci:build:angular`;
- `npm run ci:build:nest`.

### Full pre-merge CI-parity validation
Not run locally by policy: `npm ci` and `npm run ci:check` are reserved for
GitHub Actions exact-SHA validation. The workflow invokes the same root
canonical granular scripts and keeps the aggregate `Required gate`.

### Browser validation performed
Not applicable directly; this recipe changes workflow orchestration only.
Playwright/system jobs remain deferred until their prerequisite recipes
register canonical scripts and reproducible runner topology.

### Commits
Pending task commit.

### Merge / CI
Feature SHA must receive exact-SHA GitHub Actions `Required gate` before
integration; no merge or post-merge action was performed by this worker.

### Rollback
Not applicable.

### Blocker / human decision required
None.
