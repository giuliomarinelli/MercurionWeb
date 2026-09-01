# 0001 - Canonicalize REST contract ownership

- [ ] DONE
- [ ] BLOCKED

## Objective

This task has **two strictly ordered phases**.

### Phase 0 — establish a CI-capable green baseline

Before any `SYS-001` contract/monorepo implementation begins, make the repository capable of passing the complete quality gate set that the later CI pipeline will enforce.

This is a hard prerequisite, not optional cleanup. No autonomous development may proceed beyond this point while Angular or Nest has repository-controlled failures in dependency integrity, lint, type checking, tests, E2E tests, builds, or another deterministic source-quality gate intended for CI.

### Phase 1 — implement SYS-001

After Phase 0 is completely green:

- eliminate manually duplicated REST payload definitions between Angular and Nest so every public REST request/response shape is derived from one canonical, versioned contract source when safely possible;
- account for the fact that Nest DTOs are runtime `class-validator` classes while Angular consumes compile-time contract types and does not depend on `class-validator`;
- create a repository-root npm workspace containing `MercurionWebNg` and `MercurionWebNode`;
- create root `.npmrc` with `save-exact=true` and `legacy-peer-deps=true`;
- establish the approved shared/canonical contract package mechanism and common dependency ownership;
- refactor both project `package.json` files for the monorepo/workspace architecture;
- replace per-project dependency resolution with the root lockfile/install flow and verify a clean root install.

Source: `SYS-001` in Series `0001`.

## Context

The audit found REST DTOs duplicated between `MercurionWebNg/src/app/Models/**` and Nest DTOs under `MercurionWebNode/src/**/Models/DTO/**`. Angular services using `HttpClient` include auth, account, feedback, history, country, recovery, Mercurion AI and RDKit clients. The repository does not currently expose an established OpenAPI/code-generation pipeline.

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
- package/configuration files needed by the chosen contract-generation mechanism

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

Record the commands and results in `Execution notes / Preflight` before Phase 1 begins.

## Phase 1 — SYS-001 scope

### In scope

- Inventory public REST request/response payloads consumed by Angular.
- Establish one canonical contract source for those payloads.
- Replace manual client-side copies with generated or directly shared contract types.
- Add a deterministic generation/check command suitable for CI.
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
- Manual duplicated REST DTOs are not an acceptable steady state.
- The canonical REST solution must be either an OpenAPI-derived contract or a versioned shared contract package, as stated by the Series Definition of Done.
- Existing externally visible REST behaviour must be preserved unless another numbered task explicitly changes it.

## Phase 1 requirements

1. Enumerate all Angular `HttpClient` calls and the Nest endpoints they consume.
2. Identify the request/response types currently duplicated across the two applications.
3. Use one canonical source to define every public REST payload in that inventory.
4. Ensure Angular consumes generated/shared types rather than maintaining equivalent handwritten DTOs.
5. Ensure Nest remains the authoritative runtime validator at the HTTP boundary.
6. Add an automated check that fails when generated/shared contract artifacts drift from the canonical source.
7. Keep runtime serialization compatible with the current API.
8. Establish the root workspace/dependency architecture and one reproducible root lockfile/install flow.
9. After the workspace/contract changes, rerun all Phase 0 gates and preserve a fully green repository baseline.

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

### Phase 1

- [ ] Every public REST payload consumed by Angular has exactly one canonical contract definition.
- [ ] Angular contains no manually maintained duplicate of a Nest REST DTO for the covered endpoints.
- [ ] Contract generation/checking is deterministic and documented through executable package commands.
- [ ] The repository uses the intended root npm workspace/dependency topology with a reproducible root install.
- [ ] All Phase 0 quality gates remain green after the workspace/contract migration.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

### Phase 0

Run the complete bootstrap quality suite using the commands established for the current package topology. At minimum the suite must execute the Angular/Nest lint checks, explicit typechecks, all Angular tests, all Nest unit/E2E tests and both builds described above.

The verification sequence must leave the working tree unchanged except for intentionally committed remediation/configuration. Check-only commands themselves must not rewrite source.

### Phase 1

Run the new root clean-install flow and then the complete quality suite again. Also run the new REST contract generation/check command twice and verify the second execution produces no content drift.

Task `0008` will later package these same semantics into the stable root `npm ci && npm run ci:check` GitHub Actions contract; `0001` must leave it a green baseline to work from.

## Browser validation

Not applicable to the REST-contract/quality-bootstrap work itself. Contract correctness and baseline health are established through deterministic lint/type/test/build/contract gates.

## Stop conditions

Mark `BLOCKED` immediately if Phase 0 cannot produce a fully green baseline without an unresolved product/security/architecture decision. Do not continue into Phase 1 and do not allow later tasks to start on a known-red baseline.

For Phase 1, mark `BLOCKED` if the repository still contains no human-approved choice between OpenAPI generation and a versioned shared contract package. Do not make that architecture decision autonomously.

Also block if adopting the approved mechanism requires changing externally visible REST semantics not authorized by this task.

## Dependencies

- None.

## Implementation notes

Treat Phase 0 as repository bootstrap infrastructure, not incidental cleanup. Its purpose is to ensure that when task `0008` materializes the CI pipeline, CI is enforcing an already-green repository rather than revealing a backlog of known failures in the middle of autonomous development.

Prefer a migration that can be introduced incrementally but leaves the covered public REST surface with a single source of truth by task completion. Avoid a third handwritten mirror layer.

## Execution notes

### Feature branch

`feature/SYS-001`

### Preflight / Phase 0

_Not started._

### Preflight remediation

_None._

### Phase 1 summary

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
