# 0203 - Enforce Angular bundle and CommonJS gates

- [x] DONE
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
`feature/QA-017` from green `develop` base
`c3ab1fe3e6fe5684ba177c0097bad17a3bf8afc2`.
### Preflight
Clean branch and worktree confirmed. `develop`, `origin/develop` and the
feature branch all matched `c3ab1fe3e6fe5684ba177c0097bad17a3bf8afc2`.
GitHub Actions CI run `34725305751` for that exact develop SHA completed
successfully on 2026-09-12. No task-owned Angular, Nest, Tox21 or test
watchers were active before validation. Local `npm ci` and `npm run ci:check`
were not run.
### Preflight remediation
The baseline production build exposed a 1,008,929-byte initial graph against
the existing 1.02 MB budget, plus CommonJS diagnostics for RDKit,
rest-contracts and Quill's delta dependency. The existing global Quill CSS
was moved to copied public assets and is loaded by the editor-only
`QuillStylesService`, reducing the initial graph without removing editor
functionality.
### Summary
Kept the production initial maximum-error budget at a hard 1 MB and added a
machine-readable stats gate that follows the initial output graph, reports
initial/lazy output sizes and fails on undocumented CommonJS inputs. The
canonical Angular CI build invokes the gate and retains its report as a build
artifact. Quill CSS is no longer in the initial global stylesheet; the three
editor components load it only when instantiated. Narrow CommonJS exceptions
and their owners/removal plans are documented in
`docs/autonomous-development/angular-commonjs-exceptions.md`.
### Task-specific validation performed
Passed:

- `npm run ci:build:angular` — production build, 1 MB Angular budget,
  machine-readable bundle/CommonJS gate and chemistry lazy-boundary gate.
- Production initial graph: `969889` bytes of `1000000` bytes; representative
  lazy chunks include dashboard `214.59 kB`, action overlay `206.02 kB`,
  Quill `204.74 kB` and RDKit `75.56 kB`.
- CommonJS report: 17 inputs, all covered by the narrow documented allowlist;
  no undocumented inputs.
- `npm run lint:angular --workspace mercurion_web_ng`.
- `npm run typecheck --workspace mercurion_web_ng`.
- `npm run test:ci --workspace mercurion_web_ng`.
- `git diff --check`.
### Full pre-merge CI-parity validation
Not run locally by policy. Exact-SHA GitHub Actions owns clean-install and
aggregate CI parity.
### Browser validation performed
Canonical runtime sessions were started in Tox21, Nest, Angular order and
kept alive before edge requests. `http://localhost:8888/` returned two
consecutive 200 responses. Chrome DevTools MCP used the dedicated persistent
profile at `http://localhost:8888/welcome`; the public shell rendered
successfully. Navigating to
`http://localhost:8888/molecules/detail/1` rendered the molecule-detail
feature shell and requested its lazy component resources; the route displayed
the expected API-loading error for the unavailable local data record, not a
bundle or navigation failure. The network trace showed the Angular shell and
molecule-detail component resources served through the canonical edge.
No protected state or login was required for these public route checks.
The Tox21 session was stopped after startup validation; Nest reported an
existing `EPERM` copyfile diagnostic while compiling its watch output, but
the process remained alive and the public Angular route was validated.
All task-owned runtime sessions were stopped and no task-owned runtime/watch
process remained.
### Commits
`35ba4045a1a0954ce70cd01e0d88d4e4ddc11f72`
(`qa: enforce angular bundle and commonjs gates`), pushed to
`origin/feature/QA-017`.
### Merge / CI
Feature SHA will be pushed after the task-specific commit. Exact feature-SHA
CI remains coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
