# 0001 - Canonicalize REST contract ownership

- [ ] DONE
- [ ] BLOCKED
- [x] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

This task has **two strictly ordered phases**.

### Phase 0 — establish a CI-capable green baseline

Before any `SYS-001` contract/monorepo implementation begins, make the repository capable of passing the complete quality gate set that the later CI pipeline will enforce.

This is a hard prerequisite, not optional cleanup. No autonomous development may proceed beyond this point while Angular or Nest has repository-controlled failures in dependency integrity, lint, type checking, tests, E2E tests, builds, or another deterministic source-quality gate intended for CI.

### Phase 1 — implement SYS-001

After Phase 0 is completely green:

- eliminate manually duplicated Angular REST wire definitions so every public request/response shape derives from the versioned shared package, while retaining checked Nest validation adapters where required;
- account for the fact that Nest DTOs are runtime `class-validator` classes while Angular consumes compile-time contract types and does not depend on `class-validator`;
- create a repository-root npm workspace containing `MercurionWebNg` and `MercurionWebNode`;
- create root `.npmrc` with `save-exact=true` and `legacy-peer-deps=true`;
- establish the approved versioned, framework-neutral shared contract package and common dependency ownership;
- refactor both project `package.json` files for the monorepo/workspace architecture;
- replace per-project dependency resolution with the root lockfile/install flow and verify a clean root install.

Source: `SYS-001` in Series `0001`.

## Context

The audit found REST DTOs duplicated between `MercurionWebNg/src/app/Models/**` and Nest DTOs under `MercurionWebNode/src/**/Models/DTO/**`. Angular services using `HttpClient` include auth, account, feedback, history, country, recovery, Mercurion AI and RDKit clients. The approved migration uses a shared package for portable wire contracts while preserving Nest-only runtime validation adapters where necessary.

The audited baseline is not yet suitable for the future CI pipeline: Angular tests/build quality gates and Nest Jest/lint/config behaviour contain known failures or missing deterministic checks. These must be resolved **before** the actual SYS-001 implementation begins.

A later numbered task may describe one of the same baseline defects in more depth. That does not defer the repair. If the defect would make the canonical CI red today, Phase 0 takes precedence and fixes the minimum correct root cause now. The later task must then verify, refine or become effectively satisfied; it must not be used as justification for carrying a deliberately red baseline forward.

## Relevant files and modules

### Phase 0 quality/bootstrap surface

- `MercurionWebNg/package.json`
- `MercurionWebNg/angular.json`
- `MercurionWebNg/tsconfig*.json`
- Angular Karma/test configuration and all Angular specs
- Angular ESLint configuration to be established if absent
- `MercurionWebNode/package.json`
- `MercurionWebNode/eslint.config.mjs`
- `MercurionWebNode/tsconfig*.json`
- Nest Jest configuration and `test/jest-e2e.json`
- Nest environment/bootstrap code that currently affects Jest process termination
- any repository-controlled source/configuration that makes the mandatory baseline gates fail

### SYS-001 contract/workspace surface

- `MercurionWebNg/src/app/Models/`
- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/account.service.ts`
- `MercurionWebNg/src/app/services/feedback.service.ts`
- `MercurionWebNg/src/app/services/history.service.ts`
- `MercurionWebNg/src/app/services/rd-kit-api.service.ts`
- `MercurionWebNode/src/app_modules/**/Models/DTO/`
- `MercurionWebNode/src/app_modules/**/controllers/`
- root/project package manifests and lockfiles
- shared-package exports plus deterministic contract/parity checks
- `.github/workflows/ci.yml` bootstrap workflow

## Phase 0 — mandatory green baseline

### Rule

**Do not begin the REST-contract/monorepo implementation until every applicable Phase 0 gate is green.**

Phase 0 is the first executable work on `feature/SYS-001` after that branch is created.

If a required deterministic gate does not yet exist, creating that gate is part of Phase 0. A missing lint/typecheck/test command is a baseline defect, not permission to skip the check.

### Angular gates

Establish and run all of the following from a clean dependency state:

1. dependency/lockfile integrity under the pre-workspace package topology;
2. a supported Angular 20-compatible **non-mutating lint check** for TypeScript/templates;
3. a separate explicit lint-fix command for remediation; CI/preflight must never depend on auto-fix;
4. TypeScript application typecheck with no emit using the canonical application tsconfig;
5. Angular template/AOT type checking through the production build;
6. the **entire Angular/Karma test suite** in non-watch headless mode;
7. production build, including the currently configured bundle/budget gates;
8. every other deterministic Angular source/static gate already present in the repository.

The final Phase 0 result must contain no unresolved Angular lint/type/test/build failure that a later CI job would immediately rediscover.

### Nest gates

Establish and run all of the following from a clean dependency state:

1. dependency/lockfile integrity under the pre-workspace package topology;
2. a **non-mutating ESLint check** over the intended source/test scope;
3. a separate explicit lint-fix command; the current `lint` behaviour that always uses `--fix` must not be the verification gate;
4. TypeScript no-emit typecheck using the canonical Nest tsconfig;
5. the **entire Jest unit/spec suite**;
6. the **entire Jest E2E suite** using `test/jest-e2e.json`;
7. Nest build;
8. every other deterministic Nest source/static gate already present in the repository.

The existing environment-validation/process-termination behaviour must not be allowed to make Jest return failure after otherwise passing suites. Fix the root testing/bootstrap boundary rather than ignoring the exit code.

### Remediation policy

When any Phase 0 gate fails:

1. diagnose the root repository-controlled cause;
2. fix it on `feature/SYS-001`;
3. do not weaken, skip or exclude the gate merely to obtain green output;
4. keep preflight/bootstrap remediation clearly identifiable in commits and Execution notes;
5. rerun the **complete Phase 0 suite**, not only the previously failing command;
6. repeat until the complete baseline is green.

If fixing a blocking quality defect overlaps a later numbered task, the prerequisite rule wins: fix the minimum correct root cause now so CI can be viable. Do not knowingly retain a red test/lint/type/build condition merely because a later task also mentions it.

If a failure cannot be repaired safely without an unresolved product/security/architecture decision, mark `0001` `BLOCKED`. No later development task may start from that red baseline.

### Phase 0 completion criterion

Phase 0 is complete only when all applicable Angular and Nest gates above return success from a clean/reproducible dependency state and the verification commands themselves are deterministic and non-mutating.

Phase 0 must also create a minimum GitHub Actions workflow at `.github/workflows/ci.yml`. It runs the complete established bootstrap gate set on every push to `develop` and on pull requests targeting `develop`, uses deterministic clean installs and non-mutating checks, and exposes one unambiguous result that can be matched to the exact pushed SHA. It must not deploy, publish, auto-fix or require production credentials. This workflow evaluates the merge of task `0001` itself and remains the real post-merge gate for tasks `0002`-`0007`; task `0008` completes it into the canonical root CI interface.

Record the commands and results in `Execution notes / Preflight` before Phase 1 begins.

## Phase 1 — SYS-001 scope

### In scope

- Inventory public REST request/response payloads consumed by Angular.
- Establish one versioned, framework-neutral shared contract package as the canonical source for those payloads.
- Replace manual client-side wire-shape copies with types imported from that package.
- Add a deterministic contract/parity check command suitable for CI.
- Remove obsolete duplicate declarations once consumers use the canonical source.
- Create the root npm workspace for Angular and Nest and the root dependency/lockfile topology described above.
- Re-run the complete quality suite after the workspace migration so Phase 0 green status is preserved under the new topology.

### Out of scope

- GraphQL contracts; those are handled by later tasks.
- WebSocket contracts.
- Unrelated API redesigns or endpoint renames.
- Changes to `../MercurionTox21`.
- Weakening quality thresholds to make Phase 0 pass.

## Decisions already made

- A CI-capable green baseline is a prerequisite for all subsequent autonomous development.
- The baseline must be repaired at the beginning of task `0001`, before SYS-001 feature/refactor work.
- Every repository-controlled condition that would make the later canonical CI fail must either be green or have a deterministic gate created and then made green.
- Missing Angular lint and mutating-only Nest lint verification are bootstrap defects and must be corrected in Phase 0.
- All Angular tests and all Nest Jest unit/E2E tests are mandatory baseline gates.
- Typecheck and builds are mandatory even when tests compile/transpile successfully.
- Later task numbering does not defer a known baseline defect that prevents CI viability.
- Manual duplication of public REST wire shapes is not an acceptable steady state.
- The approved canonical REST source is a versioned, framework-neutral package in the root npm workspace, consumed by both Angular and Nest.
- Angular must never import Nest transport classes or depend on `class-validator`, `class-transformer`, or another Nest-only runtime concern.
- Nest decorated DTO classes may remain at the HTTP boundary when runtime validation/transformation requires them. They are boundary adapters, not an independently evolving canonical contract, and must be kept structurally/behaviourally aligned with the shared wire contract by deterministic checks.
- Deduplication is incremental and non-breaking: share transport semantics that both applications can consume, but do not force framework-specific implementation classes into the shared package.
- Existing externally visible REST behaviour must be preserved unless another numbered task explicitly changes it.

## Phase 1 requirements

1. Enumerate all Angular `HttpClient` calls and the Nest endpoints they consume.
2. Identify the request/response types currently duplicated across the two applications.
3. Classify each payload into framework-neutral wire semantics and any Nest-only validation/transformation adapter concerns.
4. Define every public REST wire payload in the versioned shared package without Angular or Nest runtime dependencies.
5. Ensure Angular imports those shared types rather than maintaining equivalent handwritten wire DTOs.
6. Keep Nest as the authoritative runtime validator at the HTTP boundary. Retain decorated DTO adapters where required, but constrain or map them to the shared contract instead of treating them as a second canonical source.
7. Add deterministic compile-time and/or contract tests that fail when a Nest boundary adapter, serializer, mapper, or Angular consumer drifts from the shared wire contract.
8. Preserve current Nest validation, transformation and serialization behaviour as well as the externally visible JSON shape.
9. Establish the root workspace/dependency architecture and one reproducible root lockfile/install flow.
10. After the workspace/contract changes, rerun all Phase 0 gates and preserve a fully green repository baseline.

## Acceptance criteria

### Phase 0

- [ ] Angular has a deterministic non-mutating lint gate and separate fix command, and the lint gate is green.
- [ ] Nest has a deterministic non-mutating lint gate and separate fix command, and the lint gate is green.
- [ ] Angular explicit type/template checks are green.
- [ ] Nest explicit typecheck is green.
- [ ] Every Angular/Karma test runs headlessly and passes.
- [ ] Every Nest Jest unit/spec test passes with process exit code 0.
- [ ] Every Nest Jest E2E test passes with process exit code 0.
- [ ] Angular production build, including configured quality/budget gates, passes.
- [ ] Nest build passes.
- [ ] No repository-controlled failure remains that would make the planned canonical CI immediately red.
- [ ] The full Phase 0 suite has been rerun after the final remediation and is green before Phase 1 starts.
- [ ] A bootstrap `.github/workflows/ci.yml` runs the complete Phase 0 gate set on pushes to `develop` and reports an exact-SHA terminal result without deploying or mutating source.

### Phase 1

- [ ] Every public REST payload consumed by Angular has exactly one canonical framework-neutral wire-contract definition in the shared package.
- [ ] Angular imports the shared package and contains no manually maintained duplicate wire DTO for the covered endpoints.
- [ ] Angular has no dependency on Nest transport classes, `class-validator`, or `class-transformer`.
- [ ] Any retained Nest decorated DTO is demonstrably a boundary adapter whose public shape and mapping/serialization are checked against the shared contract.
- [ ] Current Nest validation/transformation behaviour and externally visible JSON remain compatible.
- [ ] Contract/parity checking is deterministic and documented through executable package commands.
- [ ] The repository uses the intended root npm workspace/dependency topology with a reproducible root install.
- [ ] All Phase 0 quality gates remain green after the workspace/contract migration.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

### Phase 0

Run the complete bootstrap quality suite using the commands established for the current package topology. At minimum the suite must execute the Angular/Nest lint checks, explicit typechecks, all Angular tests, all Nest unit/E2E tests and both builds described above.

The verification sequence must leave the working tree unchanged except for intentionally committed remediation/configuration. Check-only commands themselves must not rewrite source.

Validate the bootstrap Actions workflow syntax and local command parity. After the no-fast-forward task merge is pushed to `develop`, the coordinator must wait for this workflow on the exact merge SHA; absence of a matching run is not success.

### Phase 1

Run the new root clean-install flow and then the complete quality suite again. Also run the new REST contract/parity check twice and verify the second execution produces no content drift.

Task `0008` will later package these same semantics into the stable root `npm ci && npm run ci:check` GitHub Actions contract; `0001` must leave both a green baseline and continuous bootstrap `develop`-push coverage to work from.

## Browser validation

Not applicable to the REST-contract/quality-bootstrap work itself. Contract correctness and baseline health are established through deterministic lint/type/test/build/contract gates.

## Stop conditions

Mark `BLOCKED` immediately if Phase 0 cannot produce a fully green baseline without an unresolved product/security/architecture decision. Do not continue into Phase 1 and do not allow later tasks to start on a known-red baseline.

For Phase 1, the architecture decision is resolved: use the versioned framework-neutral shared package described above. Mark `BLOCKED` only if a covered payload cannot be moved to that canonical wire contract without an unauthorized externally visible REST change, loss of required Nest runtime validation/transformation, or an unsafe migration that cannot be protected by parity tests.

## Dependencies

- None.

## Implementation notes

Treat Phase 0 as repository bootstrap infrastructure, not incidental cleanup. Its purpose is to make the very first task merge independently verifiable and to ensure that when task `0008` completes the canonical CI pipeline, CI is enforcing an already-green repository rather than revealing a backlog of known failures in the middle of autonomous development.

Prefer a non-breaking incremental migration that leaves the covered public REST wire surface with a single source of truth by task completion. Deduplicate the portable contract, not every framework-specific class: a Nest `class-validator` DTO may remain when needed, but it must be a checked adapter and must never become an Angular dependency or a third independently maintained truth source.

## Execution notes

### Feature branch

`feature/SYS-001`

### Preflight / Phase 0

Completed locally on `feature/SYS-001` before Phase 1. The worker established
the required Angular and Nest lint, typecheck, test, E2E, build, contract, and
bootstrap workflow gates. The coordinator independently reran
`npm run bootstrap:check` successfully before integration.

### Preflight remediation

Commit `e9290446dc12aadea7153d2875b1ba7d30083549` established the green local
bootstrap, including deterministic non-mutating checks and the initial
`.github/workflows/ci.yml`.

### Phase 1 summary

Commit `b576281dc4acaf84a1186522b419a10518ca9eea` added the root workspace and
versioned framework-neutral REST contract package, migrated Angular consumers,
and retained checked Nest boundary adapters. The final feature branch is
preserved locally and remotely at that SHA.

### Task-specific validation performed

Root clean install and contract checks passed locally. Contract drift checking
passed twice, Angular had no Nest or validation-framework dependency, and the
workflow YAML parsed successfully.

### Full pre-merge CI-parity validation

The worker and coordinator both completed the full local bootstrap gate. The
coordinator run passed Angular lint/typecheck, 157 tests and production build,
plus Nest lint/typecheck, 115 unit suites, one E2E suite and build.

### Browser validation performed

_Not applicable._

### Commits

- `e9290446dc12aadea7153d2875b1ba7d30083549` - Phase 0 bootstrap.
- `b576281dc4acaf84a1186522b419a10518ca9eea` - SYS-001 implementation and
  local completion evidence.

### Merge / CI

The coordinator merged with `--no-ff --no-gpg-sign` as
`42e12ce8c18bbdefd9334ea4aa62342c84051eb8`. Exact-SHA workflow run
`33571236825` failed:
https://github.com/giuliomarinelli/MercurionWeb/actions/runs/33571236825

Cause category: confirmed repository-controlled regression. On the Linux
runner, 30 Nest suites could not load
`@css-inline/css-inline-linux-x64-gnu` from the root lockfile generated and
validated on Windows.

### Rollback

The merge was reverted with `--no-gpg-sign` as
`f1ab67e36b2d8d07172a5cb14aca7cea60de6d30`. Its tree
`a7af14ef327ef574f108db4ae0cc4768005b546e` exactly matches the pre-merge
`develop` tree. Reverting task 0001 also removed the first bootstrap workflow,
so no exact-SHA recovery run exists for the revert commit. The feature branch
remains frozen at `b576281dc4acaf84a1186522b419a10518ca9eea`.

### Blocker / human decision required

Session-fatal initial-baseline incident: task 0001 could not establish a
cross-platform green CI baseline, and the mandatory recovery SHA cannot be
observed green because the reverted baseline contains no workflow. Review the
frozen branch and repair the root lockfile's Linux optional native dependency
in a new human-authorized session.
