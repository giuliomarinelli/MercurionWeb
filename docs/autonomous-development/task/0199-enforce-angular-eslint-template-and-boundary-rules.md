# 0199 - Enforce Angular ESLint, template and boundary rules

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Establish a real non-mutating Angular ESLint/template-lint quality gate that covers TypeScript and templates, enforces accessibility and architectural boundaries, and rejects direct browser persistence or environment-specific imports outside their canonical adapters.

Source: `QA-013` in Series `0001`.

## Context

The permanent baseline provides a non-mutating Angular lint command with a
separate fix command and permits the explicitly measured migration warnings.
Task `0008` later exposes the root aggregate. This task hardens the Angular rule
set to zero findings and enforces template/boundary decisions rather than
creating a parallel pipeline.

## Relevant files and modules

- `MercurionWebNg/package.json`
- Angular/ESLint configuration to add or consolidate
- Angular templates and production/test TypeScript
- storage adapter/registry from FE tasks
- environment/config boundary from FE-001–FE-003
- UI accessibility contracts
- root CI scripts from `0008`

## In scope

- Configure current Angular-compatible ESLint tooling for TypeScript and Angular templates.
- Add a check-only `lint`/`lint:angular` command and a distinct explicit fix command.
- Fail on warnings in CI (`--max-warnings=0` or equivalent).
- Enable useful Angular/template accessibility and correctness rules.
- Enforce no direct `localStorage`/`sessionStorage` usage outside the canonical persistence adapter/registry.
- Enforce no environment-variant-specific imports such as direct development/testing environment modules.
- Enforce important import/layer boundaries established by previous architectural tasks.
- Lint tests with an appropriate test-aware ruleset without weakening production rules globally.

## Out of scope

- Do not run lint with `--fix` in CI/preflight.
- Do not add broad `eslint-disable` blocks or entire-directory exclusions to obtain green output.
- Do not duplicate structural graph checks better owned by `0201`; lint may catch local violations while architecture tests remain authoritative for graph-wide properties.
- Do not lint generated/vendor/build artifacts.

## Decisions already made

- CI lint is read-only/check-only; autofix is an explicit developer command.
- Warnings are quality findings and fail the canonical gate.
- Browser persistence and environment-specific imports have narrow canonical owners.
- Template accessibility is part of Angular lint quality, not a separate optional check.

## Requirements

1. Add/pin Angular-compatible ESLint and `@angular-eslint` packages/configuration through the root workspace dependency model.
2. Define TypeScript and template configurations that cover maintained Angular source and tests.
3. Add non-mutating lint scripts and separate fix scripts at project/root level consistent with `0008`.
4. Enable rules for Angular/template correctness, accessible interaction/labels where supported and high-value TypeScript defects.
5. Encode repository-specific restrictions for direct browser storage and environment-specific imports with narrowly scoped adapter exceptions.
6. Encode import boundaries where ESLint can express them without duplicating an entire graph analyzer.
7. Repair all current lint findings rather than suppressing them broadly.
8. Register Angular lint in canonical `ci:check`/CI job output with zero warnings.

## Acceptance criteria

- [ ] Angular TypeScript and templates are covered by a non-mutating ESLint command.
- [ ] CI/preflight lint exits non-zero on any error or warning.
- [ ] Direct browser storage/environment-specific import violations outside approved adapters are mechanically rejected.
- [ ] Template accessibility/correctness rules are active.
- [ ] Autofix exists only as a separate explicit command.
- [ ] There are no broad production-code suppressions/exclusions used to make the gate green.

## Validation

Run Angular lint check and fix commands separately to verify check is non-mutating, deliberately test representative boundary violations, then run Angular tests/typecheck/build and repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the selected Angular/ESLint versions are incompatible with the repository's Angular toolchain and resolving it requires a dependency/toolchain migration outside this task, or if an architectural exception has no approved owner/rationale.

## Dependencies

- `0008` canonical lint/CI semantics must be `DONE`.
- FE environment/storage ownership tasks and relevant UI accessibility tasks should be `DONE`.
- `0187` should provide a green Angular test baseline before broad lint remediation.

## Implementation notes

Prefer enforceable architecture over comments such as “do not use localStorage here”. Repository-specific restrictions may use ESLint restricted-import/syntax rules or a small custom rule only when the canonical tools cannot express the contract cleanly.

## Execution notes

### Feature branch
`feature/QA-013`, based on `47f2f253753ad59b6669b30f213e6f5d1f91a97f`.

### Preflight
Clean branch identity was confirmed before editing: `feature/QA-013` pointed
at the supplied base SHA, with `origin/develop` and local `develop` at the
same SHA. The exact base Actions run `34718596158` was successful for the
`CI` workflow. The local repository signing setting was `commit.gpgSign=false`.
No task-owned Angular, Nest, Tox21, Karma, or workspace watcher was active.
Dependencies `0008` and `0187` were `DONE`; the completed FE environment,
storage, import-graph, and UI accessibility owners were verified in the task
registry. `npm ci` and `npm run ci:check` were not run locally.
### Preflight
_Not started._
### Preflight remediation
None required. The existing pinned Angular 20 / `angular-eslint` 20.7.0 /
ESLint 9.39.5 toolchain was compatible. The pre-change lint inventory reported
legacy warnings, so the implementation made the check-only gate explicit and
kept the accepted composite-control exceptions path-specific.
### Summary
Angular now has a zero-warning, check-only `lint:angular` command with an
explicit separate `lint:fix` command. Root `lint:angular`, `lint:angular:fix`,
and `ci:lint:angular` commands expose the same interface; CI uses
`--max-warnings=0` and never autofixes. The flat config covers TypeScript and
external/inline Angular templates, retains Angular recommended and template
accessibility/correctness configurations, and rejects direct storage access or
environment-variant imports through a small local ESLint boundary rule.
Approved storage owners are limited to the browser storage registry and
session-sync adapter. Existing composite-widget event boundaries are narrowly
documented; no directory-wide exclusions or broad production suppressions were
added. A temporary negative fixture proves both storage and environment
violations are rejected and is removed in `finally`, leaving no fixture in the
tree.

The check-only gate also required removal of the remaining lint findings in
the touched templates and code, including the invalid toast ARIA token,
unassociated custom-editor label, redundant boolean coercion, and stale lint
directive. Existing Angular ESLint packages were already pinned in the
workspace dependency model, so no dependency migration was necessary.
### Task-specific validation performed
Passed:

- `npm run lint:angular --workspace mercurion_web_ng` — exit 0, zero errors
  and zero warnings.
- `npm run ci:angular:eslint-boundaries` — negative fixture rejected both
  direct browser storage and `environment.development` imports.
- Check-only mutation probe around `lint:angular` — passed; the command did
  not change the working tree.
- `npm run typecheck --workspace mercurion_web_ng` — exit 0.
- `npm run test:ci --workspace mercurion_web_ng` — complete Angular suite,
  exit 0.
- `npm run build --workspace mercurion_web_ng` — exit 0. Existing Angular
  bundle/CommonJS warnings were non-fatal build diagnostics, not lint
  warnings.
- `npm run ci:angular:environment-imports` — passed, including its negative
  check.
- `npm run ci:angular:storage-registry` — passed.
- `npm run ci:angular:import-graph` — passed, including its synthetic-cycle
  negative check.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
The supplied base was green in Actions. Full clean-install and aggregate
CI-parity validation is intentionally delegated to GitHub Actions for the
published exact feature SHA; local `npm ci` and `npm run ci:check` remain
forbidden.
### Browser validation performed
_Not applicable._
### Commits
- `c9a2ba3a915b7a4d9ec7857fa5247c25db99ddb8` — Angular zero-warning lint
  gate, boundary rule/negative fixture, focused repairs, and task notes.
- A metadata-only follow-up commit records the final pushed SHA in these notes.
### Merge / CI
Feature publication and exact feature-SHA CI observation are coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
