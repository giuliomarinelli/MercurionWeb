# 0141 - Enable full TypeScript strictness in Nest

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Compile the Nest production/test codebase with full TypeScript strictness, `unknown` catch variables, safe bind/call/apply semantics and fallthrough protection without global escape hatches.

Source: `BE-027` in Series `0001`.

## Context

`MercurionWebNode/tsconfig.json` currently has `strictNullChecks: true` but explicitly disables `noImplicitAny`, `useUnknownInCatchVariables`, `strictBindCallApply` and `noFallthroughCasesInSwitch`. The comment on catch variables records this as temporary compatibility debt. Earlier BE tasks introduce typed errors, ports/config and smaller use cases, which should substantially reduce the migration surface.

## Relevant files and modules

- `MercurionWebNode/tsconfig.json`
- Nest production/test TypeScript source
- typed error contracts from `0127`/`0128`
- config/ports introduced by prior BE tasks
- lint/typecheck CI gates

## In scope

- Enable `strict: true` (or the equivalent complete strict family) and remove contradictory global disables.
- Enable `useUnknownInCatchVariables`, `strictBindCallApply` and `noFallthroughCasesInSwitch` explicitly where needed for clarity.
- Fix every resulting production/test type error through narrowing, discriminated types, generics or correct initialization.
- Remove unjustified explicit/implicit `any` revealed by the stricter compiler.
- Add/keep a dedicated non-emitting Nest typecheck command in canonical CI.

## Out of scope

- Do not suppress errors globally with `skip` patterns, `// @ts-ignore`, broad `as any` or weakened third-party wrappers.
- Do not change public behaviour merely to satisfy the compiler.
- Do not enable unrelated experimental compiler options without need.

## Decisions already made

- Strictness is a repository invariant, not an opt-in per file.
- Catch values are `unknown` until narrowed.
- Genuine vendor typing gaps are isolated behind narrow typed adapters rather than leaking `any` through application code.

## Requirements

1. Record the compiler error baseline before enabling the strict options.
2. Enable complete strict checking and the audited standalone flags.
3. Fix errors in dependency order, preferring already-established DTO/error/port contracts.
4. Replace unsafe catch/property access with typed guards and canonical error normalization.
5. Replace unsafe function binding/call sites and make switch fallthrough explicit or impossible.
6. Add a `typecheck`/equivalent `tsc --noEmit` gate and register it in root `ci:check` if not already present.
7. Add a static check preventing new global compiler relaxations.

## Acceptance criteria

- [ ] Nest compiles with full TypeScript strictness.
- [ ] `noImplicitAny`, `useUnknownInCatchVariables`, `strictBindCallApply` and `noFallthroughCasesInSwitch` are enabled.
- [ ] No migration-wide `as any`/ignore comments are used to fake success.
- [ ] Production and test code both pass the strict typecheck.
- [ ] CI fails on a newly introduced strict type error.

## Validation

Run the canonical Nest typecheck, lint, full unit/E2E tests, build and repository-wide CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a third-party API has irreconcilably incorrect typings and no narrow adapter/augmentation can safely represent the runtime contract; record the exact vendor boundary instead of weakening global strictness.

## Dependencies

- `0127`/`0128` typed error work and `0130` config typing should be `DONE`.
- `0140-normalize-nest-naming-and-remove-legacy-misspellings.md` should be `DONE` to avoid fixing types on names immediately removed afterward.

## Execution notes

### Feature branch
`feature/BE-027`, based on `49574285c3405485cfc7389111911c6a63ebed8d` (exact `develop` HEAD).
### Preflight
Clean feature branch matched `develop` at the supplied base SHA. No task-owned Angular,
Nest, Tox21, test watcher, or workspace-consuming process was active. The exact base
SHA had successful GitHub Actions evidence (`34946986880`, CI success). The inherited
session configuration matched GPT-5.6 Luna, medium reasoning, default 300k context.
The pre-strict baseline `npm run typecheck --workspace mercurion_web_node` passed.
### Preflight remediation
The strict compiler probe (`npx tsc --noEmit -p MercurionWebNode/tsconfig.json
--strict --useUnknownInCatchVariables --strictBindCallApply
--noFallthroughCasesInSwitch`) recorded 383 strict-property-initialization errors,
15 unknown-catch errors and the remaining narrow indexing/vendor diagnostics.
### Summary
Enabled the complete Nest strict compiler family and audited standalone strict flags.
Initialized DTO/entity fields with definite-assignment assertions where framework
construction supplies values, narrowed unknown catch values through a shared
non-throwing error formatter, corrected typed SQL result rows and strict test mocks,
and removed the untyped nodemailer import boundary. Added a CI static policy guard
for required Nest strictness options; the existing root `ci:typecheck:nest` command
remains the canonical non-emitting gate.
### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_node`
- `npm run lint --workspace mercurion_web_node`
- `npm run build --workspace mercurion_web_node`
- `npm run test --workspace mercurion_web_node -- --runInBand` (154 suites, 475 tests)
- `npm run test:e2e --workspace mercurion_web_node -- --runInBand` (3 tests)
- `node scripts/check-nest-strictness.mjs`
- `git diff --check`
### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are prohibited; exact-SHA
feature validation is owned by GitHub Actions after push.
### Browser validation performed
_Not applicable._
### Commits
Pending task commit.
### Merge / CI
Feature SHA must receive exact-SHA GitHub Actions validation before integration.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
