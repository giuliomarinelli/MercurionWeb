# 0200 - Make Nest ESLint zero-finding

- [ ] DONE
- [ ] BLOCKED

## Objective

Turn Nest lint into a strict non-mutating zero-error/zero-warning quality gate, remove the current broad safety-rule disables and remediate production findings so unsafe typing/promise behavior remains only inside bounded explicitly justified adapters.

Source: `QA-014` in Series `0001`.

## Context

The audit measured approximately 281 ESLint errors and 269 warnings across 213 Nest files. The current `eslint.config.mjs` disables several high-value TypeScript rules including explicit-any, unsafe argument/assignment/call/member-access/return and floating-promises, while the current package lint script runs ESLint with `--fix`. Phase 0/`0008` already require a non-mutating lint check and separate fix command. This task makes the backend gate genuinely strict rather than green by configuration suppression.

## Relevant files and modules

- `MercurionWebNode/eslint.config.mjs`
- `MercurionWebNode/package.json`
- `MercurionWebNode/src/**/*.ts`
- `MercurionWebNode/test/**/*.ts`
- external HTTP/storage/provider adapters
- generated/schema boundaries
- root CI scripts from `0008`

## In scope

- Convert the canonical Nest lint command to check-only and keep autofix separate.
- Fail CI on any error or warning.
- Re-enable high-value TypeScript safety rules that are currently broadly disabled.
- Remediate existing production findings, including unsafe `any`, promise handling and type narrowing, rather than suppressing them globally.
- Permit narrowly bounded unsafe external payload handling only at adapter/decoder boundaries with local rationale and runtime validation.
- Apply a suitable test-file override where test doubles legitimately need different rules without weakening production source.
- Exclude only generated/vendor/build artifacts.

## Out of scope

- Do not keep `--fix` in the CI/preflight lint command.
- Do not silence hundreds of findings with wildcard ignores or top-level rule disables.
- Do not replace type safety with arbitrary `as unknown as` casts solely to satisfy ESLint.
- Do not rewrite unrelated architecture when a small typed adapter/decoder resolves the finding.

## Decisions already made

- Production Nest lint ends with zero errors and zero warnings.
- High-value unsafe-TypeScript rules are enabled for production source.
- External untyped data is validated/narrowed at bounded adapters.
- Test rules may differ only through explicit test-specific configuration.

## Requirements

1. Capture the current lint baseline and classify findings by rule/module before remediation.
2. Split check-only and fix commands consistently with `0008`; configure warnings as failures.
3. Re-enable `no-explicit-any`, `no-floating-promises` and the relevant `no-unsafe-*` family for production source, unless a specific rule is demonstrably inappropriate and documented.
4. Replace unsafe external payload access with typed DTOs/codecs/type guards at HTTP/provider/storage boundaries.
5. Await/return/intentionally void Promises according to actual lifecycle semantics rather than suppressing floating-promise findings.
6. Use local disable comments only when the unsafe boundary is unavoidable, include rationale, and keep the scope to the minimum statement/file.
7. Configure test-specific exceptions separately and keep production rule strength unchanged.
8. Register the strict Nest lint command in canonical CI and prove it is non-mutating.

## Acceptance criteria

- [ ] Maintained production Nest source has zero ESLint errors and zero warnings.
- [ ] The canonical lint command is check-only and fails on warnings.
- [ ] Broad disabling of meaningful unsafe/promise rules is removed.
- [ ] Remaining unsafe external values are bounded, runtime-validated and locally justified.
- [ ] No broad production directory/file exclusion hides findings.
- [ ] The strict gate runs in canonical CI parity.

## Validation

Run strict Nest lint twice and verify the check command changes no files, run typecheck/tests/build, inspect remaining local suppressions for scope/rationale, then run repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a third-party library exposes fundamentally untypable APIs and a safe adapter cannot be created without replacing that dependency, or if enabling a rule exposes an unresolved public contract requiring human input.

## Dependencies

- `0008` canonical lint/CI semantics must be `DONE`.
- BE strictness/config/error-boundary refactors should be `DONE`.
- `0188` should provide a reliable Jest baseline before large lint remediation.

## Implementation notes

The goal is safer code, not a cosmetic zero. Avoid transformations that satisfy ESLint while preserving the same unchecked runtime assumptions under casts.

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