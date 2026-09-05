# 0111 - Make heavy Angular features lazy and meet production bundle budgets

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Make Quill, RDKit, dashboard/chart and non-initial action code load only at their feature boundaries and bring the Angular production build under the existing bundle budgets without increasing those budgets to hide weight.

Source: `NG-025` in Series `0001`.

## Context

The Series baseline records an initial production bundle around 1.38 MB against the configured 1 MB error budget. `angular.json` currently includes Quill CSS globally and RDKit assets globally; chemistry, dashboard and action flows also contain heavyweight dependencies. Earlier tasks introduce lazy chemistry adapters, lazy dashboard widgets and a lazy action registry. This task measures the final graph and enforces the budget outcome.

## Relevant files and modules

- `MercurionWebNg/angular.json`
- `MercurionWebNg/package.json`
- Angular route manifest and lazy routes
- Quill/editor consumers
- chemistry adapters from `0104`/`0105`
- dashboard widgets from `0095`
- action registry from `0106`
- production build output/stats

## In scope

- Generate deterministic production build statistics and identify eager contributors.
- Ensure Quill runtime/styles are loaded only by editor features that need them where Angular tooling permits.
- Ensure RDKit JS/WASM/runtime is requested only by chemistry features through the approved lazy adapter.
- Ensure chart/dashboard libraries and non-initial action implementations are not in the initial application chunk.
- Remove obsolete eager imports/assets/styles revealed by the analysis.
- Keep current configured initial/component-style budgets at least as strict as they are when this task starts.
- Add a required CI bundle gate that fails on budget regression and records useful size diagnostics.

## Out of scope

- Do not raise `maximumError`/`maximumWarning` merely to make the build green.
- Do not remove product functionality or accessibility to save bytes.
- Do not replace dependencies solely on speculative size grounds without measuring the real build impact.
- Do not modify `../MercurionTox21`.

## Decisions already made

- The existing production budget is a constraint, not a target to relax.
- Large optional capabilities belong in lazy chunks.
- The initial route must not preload heavy feature code merely for convenience.
- Size assertions must use production-optimized build output, not dev-server chunk sizes.

## Requirements

1. Capture a reproducible baseline of initial and major lazy chunks before changes.
2. Trace eager dependency paths for Quill, RDKit, charts/dashboard and action implementations.
3. Remove each unnecessary eager edge using route/component/dynamic import boundaries established by earlier tasks.
4. Avoid globally registered styles/assets for feature-only dependencies when a supported lazy alternative exists.
5. Run a production build and prove the configured budget succeeds without increasing it.
6. Add deterministic CI diagnostics/reporting for initial and selected heavyweight chunks so future regressions are actionable.
7. Register the build/budget verification in canonical `ci:check` if it is not already required.

## Acceptance criteria

- [ ] Production build passes the existing initial bundle error budget without raising it.
- [ ] Quill, RDKit, chart/dashboard and action implementation code are absent from unrelated eager chunks where technically separable.
- [ ] Heavy feature code loads on demand when its feature is entered.
- [ ] CI fails if the Angular production budget is exceeded.
- [ ] Bundle diagnostics identify the main contributors when the gate fails.
- [ ] Existing feature behavior remains compatible.

## Validation

Run the production build with statistics/bundle analysis plus canonical CI-parity gates. Compare before/after initial and relevant lazy chunk sizes and record them in execution notes.

## Browser validation

Through `http://localhost:8888`, start on lightweight routes and inspect Network/Sources for absence of optional heavy feature resources; then enter editor/chemistry/dashboard/action flows and verify their chunks/resources load on demand and function correctly.

## Stop conditions

Mark `BLOCKED` rather than raising budgets if the existing budget cannot be met without an unresolved product/architecture trade-off after all approved lazy boundaries have been applied.

## Dependencies

- `0095` lazy dashboard widgets, `0104`/`0105` chemistry boundary/lifecycle and `0106` lazy action registry should be `DONE`.
- `UI-027` must have removed legacy Angular animation dependency if it contributes to eager weight.

## Execution notes

### Feature branch
_Not started._
### Preflight
_Not started._
### Preflight remediation
_None._
### Summary
Not attempted because required UI-027 is `SKIPPED_DEPENDENCY`. The references
to tasks 0095, 0104, 0105, and 0106 are advisory.
### Task-specific validation performed
Not applicable; no feature branch or implementation worker was created.
### Full pre-merge CI-parity validation
Not applicable; dependency-skip metadata only.
### Browser validation performed
Not applicable; the task was not attempted.
### Commits
Pending metadata commit on `develop`.
### Merge / CI
No feature branch or merge. Exact-SHA CI is required for the metadata commit.
### Rollback
_Not applicable._
### Blocker / human decision required
Direct terminal prerequisite: UI-027, `SKIPPED_DEPENDENCY`. Transitive chain:
NG-025 -> UI-027 -> UI-013 -> FE-030 (BLOCKED). FE-030 requires
filesystem-write capability for a fresh, human-authorized worker session.
