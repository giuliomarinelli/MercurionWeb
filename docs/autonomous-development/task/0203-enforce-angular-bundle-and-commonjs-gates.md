# 0203 - Enforce Angular bundle and CommonJS gates

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make Angular production bundle budgets and CommonJS warnings hard non-regressing CI gates, bringing the application under the existing 1 MB initial-bundle maximum without raising the limit merely to obtain green output and eliminating or explicitly isolating legacy CommonJS dependencies.

Source: `QA-017` in Series `0001`.

## Context

The audit measured an Angular production initial bundle around 1.38 MB against the existing `angular.json` maximum-error budget of 1 MB and identified a Quill/CommonJS warning. Earlier NG performance work, especially the bundle/lazy-boundary tasks, is expected to reduce eager weight before this QA task runs. This task is the final delivery gate: it measures the resulting production build, fixes remaining regressions and makes both budget and CommonJS diagnostics enforceable in canonical CI rather than warning-only knowledge.

## Relevant files and modules

- `MercurionWebNg/angular.json`
- Angular production build configuration
- root/Angular build scripts
- lazy boundaries for Quill, RDKit, charts/dashboard and action features
- dependencies producing CommonJS warnings
- bundle stats/report tooling
- `.github/workflows/ci.yml`

## In scope

- Run a clean production Angular build and capture initial/lazy chunk sizes and CommonJS warnings.
- Keep the existing 1 MB initial maximum-error budget as a hard ceiling; tighten only when justified by the post-refactor baseline.
- Fix remaining eager-import/lazy-boundary issues that cause the production build to exceed the budget.
- Eliminate CommonJS dependencies/warnings by using ESM entrypoints/packages or isolating unavoidable libraries behind intentional lazy boundaries.
- Permit a narrowly documented CommonJS exception only when no safe ESM replacement exists and the impact/owner/removal plan are explicit.
- Produce machine-readable bundle statistics usable as CI artifacts/regression evidence.
- Register production build/bundle diagnostics in canonical CI.

## Out of scope

- Do not raise the current 1 MB maximum solely because the build is red.
- Do not add a blanket `allowedCommonJsDependencies` list to silence warnings.
- Do not remove required product functionality merely to meet size without an approved feature decision.
- Do not duplicate application-level lazy-refactor work already completed; diagnose and finish only remaining budget offenders.

## Decisions already made

- The existing production budget is a quality requirement, not informational documentation.
- Long-term CommonJS warnings should be zero; an exception is narrow, owned and temporary/documented.
- Heavy optional features belong behind lazy boundaries where architecture permits.
- CI preserves bundle stats so size regressions are diagnosable.

## Requirements

1. Build production from clean dependencies and record current initial/lazy chunk sizes plus every CommonJS warning.
2. Trace remaining initial-bundle contributors using Angular stats/bundle analysis rather than guessing.
3. Verify the lazy boundaries created by earlier NG/UI tasks actually exclude Quill/RDKit/charts/action-heavy code from initial chunks when applicable.
4. Resolve the Quill/CommonJS warning through an ESM-compatible import/dependency or a narrowly isolated/documented exception only if replacement is not feasible.
5. Keep `maximumError` for the initial production budget at 1 MB or lower; do not loosen it to pass.
6. Configure CI to fail on an over-budget production build and on new undocumented CommonJS warnings.
7. Publish bundle stats/report as a CI artifact or concise job summary for regression analysis.
8. Add a regression test/script if Angular CLI output alone cannot reliably distinguish approved CommonJS exceptions from new ones.

## Acceptance criteria

- [ ] Clean Angular production build satisfies the existing <=1 MB initial maximum-error budget.
- [ ] No new/undocumented CommonJS warning is emitted.
- [ ] Quill/CommonJS is eliminated or represented by one narrow documented exception with owner/removal rationale.
- [ ] Heavy optional dependencies remain outside the initial bundle where intended.
- [ ] Bundle/CommonJS failures make canonical CI red.
- [ ] Bundle statistics are retained for review/regression diagnosis.

## Validation

Run a clean production Angular build with stats, inspect initial/lazy chunk composition and warning output, exercise the budget/warning gate, then Angular tests/lint/typecheck and repository-wide CI parity.

## Browser validation

Validate representative lazy-loaded heavy features through `http://localhost:8888` after bundle refactors to ensure lazy loading did not break runtime behavior.

## Stop conditions

Mark `BLOCKED` if meeting the existing budget requires removing a mandatory feature or replacing a foundational dependency with material product/architecture risk that is not already approved; do not raise the budget as the fallback.

## Dependencies

- Angular performance/lazy-boundary work from NG section, including the production bundle task, should be `DONE`.
- `0202` canonical Actions orchestration should be ready to consume this gate.
- `0199` strict Angular lint should be `DONE`.

## Implementation notes

A lazy import is successful only if the production chunk graph proves the dependency left the initial bundle. Verify the artifact; do not infer the result solely from source syntax.

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
