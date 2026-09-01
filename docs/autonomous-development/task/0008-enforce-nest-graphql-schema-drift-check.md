# 0008 - Establish canonical CI and enforce Nest GraphQL schema drift

- [ ] DONE
- [ ] BLOCKED

## Objective

Create the canonical GitHub Actions CI pipeline for MercurionWeb and make the committed `MercurionWebNode/src/schema.graphql` a verified artifact.

The pipeline must become the single authoritative gate set used both remotely by GitHub Actions and locally by every autonomous task preflight. It must cover dependency integrity, linting, type checking, all Angular tests, all Nest Jest suites, builds, generated-contract/schema drift and later registered static/contract checks.

Source: `SYS-008` in Series `0001`.

## Context

`MercurionGraphQLModule` uses `autoSchemaFile: join(process.cwd(), 'src', 'schema.graphql')`, so Nest resolver/type metadata is authoritative for the committed GraphQL schema.

The repository also needs deterministic task isolation: every autonomous task runs on `feature/<Source>`, is merged with an explicit merge commit into `develop`, and GitHub Actions decides whether that integration remains. A failed merge is reverted and the task is marked `BLOCKED`.

Task `0001` establishes the root npm-workspace structure for `MercurionWebNg` and `MercurionWebNode`. This task must build the CI contract on top of that root workspace rather than duplicating unrelated package-install logic in workflow YAML.

The current baseline also has lint asymmetry that must not survive this task:

- Angular currently has no canonical lint target;
- Nest's existing `lint` script uses `--fix`, which is inappropriate for a verification gate.

By the end of this task, lint verification is non-mutating and explicit fix commands are separate.

## Relevant files and modules

- root `package.json` / root lockfile created by `0001`
- `MercurionWebNg/package.json`
- `MercurionWebNg/angular.json`
- Angular TypeScript/test configuration
- Angular lint configuration introduced by bootstrap/preflight or finalized here
- `MercurionWebNode/package.json`
- Nest TypeScript/Jest/ESLint configuration
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/schema.graphql`
- GraphQL client/codegen configuration established by earlier SYS tasks
- `.github/workflows/ci.yml`

## In scope

- Establish one root, reproducible CI command interface.
- Create `.github/workflows/ci.yml` for `develop` integration and normal human PR validation.
- Make Angular and Nest lint checks non-mutating.
- Run explicit Angular and Nest type checks.
- Run **all** Angular/Karma tests headlessly.
- Run **all** Nest Jest unit tests.
- Run **all** Nest Jest E2E tests using the repository E2E Jest configuration.
- Build Angular production and Nest.
- Implement deterministic Nest GraphQL schema regeneration/drift verification.
- Run existing GraphQL/generated-code validation/drift checks established by earlier tasks.
- Provide one aggregate local command used by autonomous preflight and immediately before task merge.
- Make later CI gates extensible without creating hidden workflow-only checks.

## Out of scope

- Deploying preview/staging/production.
- Publishing packages or artifacts.
- Introducing unrelated release automation.
- Skipping unstable tests to make CI green.
- Weakening TypeScript/lint/test settings merely to obtain a passing pipeline.
- Changing public GraphQL semantics solely to eliminate current drift.

## Decisions already made

- `develop` is the autonomous integration branch.
- Each autonomous task merges through an explicit `--no-ff` merge commit.
- The runner waits for CI belonging to the **exact merge SHA** before another task starts.
- CI failure causes merge revert + `BLOCKED`; the failed feature branch is preserved.
- `schema.graphql` remains committed.
- Nest code-first metadata is authoritative; CI fails on uncommitted schema drift.
- CI lint commands are check-only. Auto-fix commands are separate developer/remediation commands.
- All existing Angular tests and all Nest Jest unit/E2E tests are gates; none are silently excluded because they are slow or inconvenient.
- Local autonomous preflight and GitHub Actions must use the same repository-controlled gate definitions.

## Canonical root command contract

Establish root scripts with equivalent semantics to the following names. Exact internal script composition may follow the workspace structure created by `0001`, but these public meanings must remain clear:

```text
npm run ci:lint
npm run ci:typecheck
npm run ci:test:angular
npm run ci:test:nest
npm run ci:test:nest:e2e
npm run ci:build
npm run ci:graphql
npm run ci:static
npm run ci:check
```

`ci:check` MUST run every required repository-controlled gate and exit non-zero on the first/aggregate failure. It must be runnable locally with no production credentials.

The ordinary parity invocation is:

```text
npm ci
npm run ci:check
```

GitHub Actions MUST use these root scripts rather than reimplementing different shell commands whose semantics can drift from local preflight.

`ci:static` is the extension point for deterministic repository checks introduced by later tasks (for example forbidden environment imports, orphan-module checks, contract registries, dependency-cycle checks). A later task that creates a mandatory CI check must register it here or in another root aggregate included by `ci:check`.

## Lint requirements

### Angular

1. Establish/finalize a supported Angular 20-compatible ESLint setup.
2. Expose a non-mutating lint check used by `ci:lint`.
3. Expose a separate explicit fix command for autonomous preflight remediation/developer use.
4. Lint production Angular TS/templates and other intended sources according to the chosen configuration.
5. Do not use lint auto-fix inside GitHub Actions.

### Nest

1. Replace the current verification semantics that rely on `eslint ... --fix`.
2. Keep a non-mutating lint check for CI.
3. Keep an explicit `lint:fix` (or equivalent) command for remediation.
4. Cover the intended `{src,apps,libs,test}` TypeScript scope.
5. CI must fail if lint findings remain after any local remediation.

## Typecheck requirements

CI must run explicit type checks in addition to builds.

### Angular

- run TypeScript application type checking with no emit using the canonical app tsconfig;
- ensure Angular template/AOT type errors are also caught by the production build;
- typecheck test sources where supported by the repository test configuration rather than allowing broken specs to survive until runtime compilation.

### Nest

- run TypeScript no-emit type checking against the canonical Nest tsconfig;
- do not rely only on Jest transpilation to prove type safety.

## Test requirements

### Angular

Run the complete Karma test suite non-interactively using a headless Chrome browser. The workflow must terminate rather than enter watch mode.

Equivalent semantics:

```text
npm test -- --watch=false --browsers=ChromeHeadless
```

If the repository's final root script wraps this differently, it must still execute every Angular test intended by the project.

### Nest

Run all unit/spec Jest tests:

```text
npm test -- --runInBand
```

and all E2E Jest tests configured through:

```text
npm run test:e2e -- --runInBand
```

Do not silently remove E2E from CI because it requires infrastructure. Provision deterministic non-production dependencies, mocks, fixtures, service containers or test harnesses as needed. If an existing suite fundamentally cannot run in CI without an unresolved architecture/infrastructure decision, this task is `BLOCKED` until that decision is resolved.

## Build requirements

Run at minimum:

- Angular production build;
- Nest build.

Build success is a separate gate from typecheck and tests because it catches Angular AOT/template/bundling issues and Nest compilation/package issues not necessarily represented by test execution.

## GraphQL and generated-artifact requirements

1. Add a deterministic command that initializes enough Nest GraphQL metadata to regenerate the code-first schema without production credentials/services.
2. Compare regenerated schema against committed `MercurionWebNode/src/schema.graphql` without rewriting it during the check.
3. CI exits non-zero on semantic/byte drift according to the deterministic comparison strategy and prints an actionable diff/path.
4. Provide a separate explicit developer command that intentionally updates the committed schema.
5. Execute Angular GraphQL document/codegen/validation drift checks created by earlier SYS tasks so generated client contracts cannot silently diverge.
6. Do not normalize away semantic differences merely to make drift pass.

## GitHub Actions pipeline

Create `.github/workflows/ci.yml` with the following behaviour.

### Triggers

At minimum:

- `push` to `develop` — mandatory for the autonomous merge/revert workflow;
- `pull_request` targeting `develop` or `master` — normal human integration review;
- `workflow_dispatch` — manual diagnostics.

The autonomous runner keys success/failure to the workflow run for the exact `develop` merge SHA.

### Permissions and safety

- default to read-only repository contents permissions;
- do not expose production secrets;
- do not deploy or publish;
- do not auto-fix source files in CI;
- do not commit generated artifacts from CI;
- use a pinned/supported Node version shared with repository developer configuration (`engines`, `.nvmrc` or equivalent) so local/CI runtimes do not drift.

### Dependency installation

Use the root workspace lockfile and clean-install semantics:

```text
npm ci
```

`npm ci` failure is a CI failure. Do not fall back to `npm install` and silently rewrite dependency resolution.

Use npm cache support when appropriate, but cache must never become required for correctness.

### Gate ordering / workflow steps

The workflow must expose clear named steps (or equivalent jobs) for:

1. checkout;
2. setup Node/npm cache;
3. root `npm ci`;
4. lint (`ci:lint`);
5. typecheck (`ci:typecheck`);
6. Angular tests (`ci:test:angular`);
7. Nest unit tests (`ci:test:nest`);
8. Nest E2E tests (`ci:test:nest:e2e`);
9. builds (`ci:build`);
10. GraphQL/generated-contract drift (`ci:graphql`);
11. registered static checks (`ci:static`).

A single sequential job is acceptable and has the advantage of exact local parity. Multiple jobs are acceptable only if they preserve the same root script semantics and the workflow result cannot report success while any required gate failed.

Do not use cancellation/concurrency settings in a way that can cancel the workflow for a merge SHA while the autonomous runner is waiting for that exact integration result.

## Autonomous preflight contract created by this task

After this task is successfully integrated, **every later task** starts and ends with CI parity:

```text
# before task implementation
npm ci
npm run ci:check

# immediately before task merge
npm ci
npm run ci:check
```

If the beginning preflight fails, the agent repairs repository-controlled failures on `feature/<Source>` first, reruns the complete suite, and only then begins task scope. If it cannot restore green, it blocks the task and does not merge it.

The end preflight must be green before `DONE` is prepared for integration.

## Requirements

1. Implement the root CI script contract above on top of the workspace structure established by `0001`.
2. Establish/finalize non-mutating Angular and Nest lint gates plus explicit fix commands.
3. Establish explicit Angular/Nest typecheck gates.
4. Run every Angular test headlessly and all Nest Jest unit/E2E suites.
5. Build Angular production and Nest.
6. Implement Nest schema generation/check/update commands.
7. Integrate all existing GraphQL/codegen drift checks.
8. Provide a deterministic `ci:static` extension point and include it in `ci:check`.
9. Create `.github/workflows/ci.yml` with the required triggers/safety/steps.
10. Prove local `npm ci && npm run ci:check` and GitHub Actions execute equivalent repository-controlled gates.
11. Ensure no workflow step auto-fixes code or mutates committed generated artifacts.
12. Ensure the workflow result is unambiguous for polling by merge SHA.

## Acceptance criteria

- [ ] Root `npm ci` succeeds from a clean checkout.
- [ ] `npm run ci:check` is the canonical aggregate and is green locally.
- [ ] Angular lint is configured and non-mutating in CI.
- [ ] Nest lint is non-mutating in CI and has a separate fix command.
- [ ] Angular and Nest explicit typechecks pass.
- [ ] Every Angular/Karma test passes headlessly.
- [ ] Every Nest Jest unit test passes.
- [ ] Every Nest Jest E2E test passes.
- [ ] Angular production build passes.
- [ ] Nest build passes.
- [ ] Nest GraphQL schema regeneration matches the committed artifact.
- [ ] A controlled resolver/type change without schema update makes `ci:graphql` fail with a useful drift diagnostic.
- [ ] Existing Angular GraphQL/generated-code drift checks run from the aggregate.
- [ ] `.github/workflows/ci.yml` runs on push to `develop` and required PR targets.
- [ ] A deliberately introduced lint/type/test/build/drift failure makes GitHub Actions fail.
- [ ] Removing that controlled failure restores a green workflow.
- [ ] No source file is modified by a CI check step.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From the repository root, after a clean install:

```text
npm ci
npm run ci:lint
npm run ci:typecheck
npm run ci:test:angular
npm run ci:test:nest
npm run ci:test:nest:e2e
npm run ci:build
npm run ci:graphql
npm run ci:static
npm run ci:check
```

Validate that `git status --short` remains clean after the check-only sequence.

Perform controlled negative tests for at least lint, typecheck/test and GraphQL schema drift; each must fail the expected gate. Restore the controlled edits, rerun the complete `ci:check`, and leave the branch green.

Finally validate the workflow on GitHub through the ordinary feature-branch -> no-ff merge -> exact merge-SHA CI lifecycle defined by `PROTOCOL.md`.

## Browser validation

Not required for the CI implementation itself. Angular tests use headless Chrome, but that is test-runner execution rather than manual Chrome DevTools MCP validation.

## Stop conditions

Mark `BLOCKED` if:

- the root workspace required from `0001` is not available and CI cannot be built without contradicting that established architecture;
- a required existing Angular/Nest test cannot be made deterministic in CI without an unresolved product/architecture/infrastructure decision;
- GraphQL schema generation fundamentally requires unavailable production-only infrastructure and no safe test/bootstrap isolation can be created;
- choosing the supported Node runtime requires an unresolved repository/toolchain compatibility decision;
- obtaining green gates would require weakening or skipping required lint/type/test/build checks rather than fixing the underlying defect.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` must be `DONE` first.

## Implementation notes

Keep GitHub Actions thin. The root package scripts are the product; the workflow is an executor. This prevents autonomous local preflight from drifting away from the checks GitHub evaluates after each merge.

Prefer deterministic checks and explicit diagnostics over clever workflow logic. The goal is for a failed autonomous merge to answer quickly: **which gate failed, on which exact merge SHA, and can the same failure be reproduced locally?**

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
