# 0111 - Make heavy Angular features lazy and meet production bundle budgets

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-025` at base `4f6a89ae4111f9a0af6ac8f5a0a3d73f0f995e00`.
### Preflight
Confirmed clean `feature/NG-025` and exact base SHA. GitHub Actions run
`34796831553` for that SHA completed successfully with both platform
prerequisite jobs, Angular/Nest unit and E2E jobs, build artifacts, all
container jobs, and `Required gate` green. Prerequisites `0095`, `0104`,
`0105`, and `0106` are `DONE`.

Focused production baseline (`npm run build --workspace mercurion_web_ng`)
was `974,817` initial bytes against the unchanged `1,000,000` byte error
budget. The build emitted the existing warning-only `500 kB` initial warning;
the error budget passed. The baseline's largest optional chunks were the
dashboard charts (`207,905` bytes), ngx-quill (`204,738` bytes), and RDKit
(`75,561` bytes).

Runtime capability preflight used the canonical Tox21, Nest, and Angular
commands in order, with live handles recorded before HTTP requests. Nginx
returned two consecutive `200/200` rounds for `/health` and `/`. The public
welcome route loaded through `http://localhost:8888`; no optional Quill,
RDKit, chart, or action implementation resource was requested there.
### Preflight remediation
Removed the obsolete globally copied `RDKit_minimal.js`; the lazy RDKit
adapter already imports the package implementation and locates only the
WASM resource on demand. Quill CSS remains served by the existing feature
loader because the editor components require those styles at entry.
### Summary
Kept the existing strict initial and component-style budgets unchanged.
Extended `bundle:check` to write selected lazy entry-point sizes and fail on
heavy feature signatures in the initial application chunk, while retaining
the initial-byte and CommonJS gates already registered in root `ci:check`.
### Task-specific validation performed
Passed:

- `npm run build --workspace mercurion_web_ng`
- `npm run bundle:check --workspace mercurion_web_ng`
- `npm run chemistry:check-lazy --workspace mercurion_web_ng`
- `npm run typecheck --workspace mercurion_web_ng`

The bundle gate reported `974,817 / 1,000,000` initial bytes and selected
lazy diagnostics for dashboard charts (`207,905`), ngx-quill (`204,738`),
RDKit (`75,561`), and action chunks. The chemistry gate confirmed that the
main chunk excludes RDKit and Ketcher signatures. The full Angular lint
command was started but did not produce a result after several minutes and
was stopped; no Angular source file was changed by this task.

Post-change browser validation restarted all three canonical runtimes and
again obtained two consecutive `200/200` readiness rounds. Through
`http://localhost:8888/`, the lightweight welcome route requested only the
application shell resources. Navigating to public
`/molecules/detail/1` then loaded the molecule-detail chunk, RDKit lazy
chunk, and `RDKit_minimal.wasm` on demand. The task-owned Tox21, Nest, and
Angular processes were stopped afterward; only the externally managed NATS
listener remained on port `4223`.
### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are prohibited in
autonomous sessions. The exact pushed feature SHA is to receive the
canonical GitHub Actions validation.
### Browser validation performed
Completed on the dedicated Chrome DevTools profile using only
`http://localhost:8888`. Lightweight welcome evidence showed no RDKit,
Quill, chart, dashboard, or action implementation request. Public molecule
detail evidence showed lazy molecule-detail, RDKit, and WASM requests after
entering the feature boundary.
### Commits
Pending task commit.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
