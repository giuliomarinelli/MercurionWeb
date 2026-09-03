# 0141 - Enable full TypeScript strictness in Nest

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
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

- Direct terminal prerequisite(s): `0127` (BE-013, SKIPPED_DEPENDENCY), `0128` (BE-014, SKIPPED_DEPENDENCY), `0130` (BE-016, SKIPPED_DEPENDENCY), `0140` (BE-026, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY -> 0141 BE-027 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
