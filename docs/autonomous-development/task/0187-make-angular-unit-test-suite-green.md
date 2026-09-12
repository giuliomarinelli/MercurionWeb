# 0187 - Make the Angular unit-test suite green

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make the complete Angular unit-test suite compile and pass deterministically with zero stale assertions, disabled/focused tests or obsolete specs, so the canonical CI gate can trust `ng test` as a real prerequisite rather than a known-red signal.

Source: `QA-001` in Series `0001`.

## Context

The audit found historical Angular test debt. The permanent baseline now keeps
the existing suite green before autonomous development can proceed; this task
strengthens its assertions and permanently removes any remaining stale or weak
coverage rather than repairing a broken session baseline.

## Relevant files and modules

- `MercurionWebNg/src/**/*.spec.ts`
- `MercurionWebNg/src/app/app.component.spec.ts`
- Angular test target in `MercurionWebNg/angular.json`
- `MercurionWebNg/package.json`
- components/services modified by FE/UI/NG tasks
- canonical root CI scripts from `0008`

## In scope

- Run the complete Angular unit-test suite and classify every compile error, failed assertion, stale import and runtime failure.
- Repair production code only when the test exposes a real regression and the fix is safe within the current contract; otherwise repair obsolete tests to assert current intended behavior.
- Replace scaffold-era expectations with meaningful current behavior assertions.
- Remove accidental `fit`, `fdescribe`, skipped/excluded tests used to hide failures.
- Make test setup deterministic and non-interactive in CI.
- Register the exact successful command in the canonical CI-parity gate if it is not already represented there.

## Out of scope

- Do not inflate this task into the broad behavior-test expansion owned by `0189`–`0191`.
- Do not delete difficult tests simply to obtain green output.
- Do not change product behavior solely to satisfy an obsolete assertion.
- Do not reduce the executed test set or weaken failure reporting.

## Decisions already made

- The full Angular suite must be green before later task implementation can be trusted.
- Current product/contracts are authoritative; scaffold defaults are not.
- A passing test command must execute in one shot without watch interaction.
- Disabled/focused tests are not an acceptable substitute for a green suite.

## Requirements

1. Execute the complete Angular unit-test target in non-watch mode from the canonical workspace/root scripts.
2. Record every initial failure and distinguish stale test, test-infrastructure defect and production regression.
3. Correct the current `AppComponent` scaffold-era title assertion and any comparable stale tests based on current application-shell semantics.
4. Search for `fit`, `fdescribe`, `xit`, `xdescribe` and equivalent exclusions; remove accidental exclusions or document a narrowly justified non-production exception.
5. Ensure no spec depends on arbitrary wall-clock sleeps or live external network calls merely to pass.
6. Run the complete suite again from a clean test invocation, not only the repaired individual specs.
7. Ensure the canonical CI script fails if any Angular unit spec fails or does not compile.

## Acceptance criteria

- [ ] The complete Angular test target exits 0 in non-watch mode.
- [ ] There are zero compile errors and zero failed specs.
- [ ] No focused or accidentally disabled production test hides a failure.
- [ ] Stale scaffold assertions/imports have been replaced with assertions against current behavior.
- [ ] The canonical CI-parity gate executes this same complete suite.

## Validation

Run the exact Angular CI test command, then Angular lint/typecheck/build and the repository-wide `npm run ci:check`. Repeat the complete Angular suite after any production-code repair to prove no unrelated regression was introduced.

## Browser validation

Not required unless a repaired production regression changes browser-visible behavior; in that case validate the affected route through `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if a failing test exposes ambiguous product behavior that cannot be resolved from existing task/contracts, or if making the suite green would require disabling tests, weakening assertions or changing an externally visible contract without an approved decision.

## Dependencies

- The permanent `CI-BASELINE.md` invariant applies and must already be green.
- `0008-enforce-nest-graphql-schema-drift-check.md` must provide the canonical CI interface.
- Relevant FE/UI/NG refactors should be `DONE` before their stale tests are rewritten.

## Implementation notes

Treat the first full-suite run as evidence. Do not assume every failure listed in the original audit still exists after preceding tasks; repair what the repository actually reports at execution time.

## Execution notes

### Feature branch
`feature/QA-001` at base `5a55371d6a1322f6b19315c4a6ccebecf3a8bfcd`.

### Preflight
Clean branch and exact identity confirmed. The supplied base SHA has a
successful GitHub Actions CI run `34712260526`, including both
`Quality (windows-latest)`, `Quality (ubuntu-latest)`, and `Required gate`
jobs. No task-owned Angular, Nest, Tox21, or test-watcher process was active;
the only Node processes were the pre-existing Chrome DevTools MCP server.
The current dependency tree was used; `npm ci` and `npm run ci:check` were
not run locally.

### Preflight remediation
None required. The existing `MercurionWebNg` test target and root
`ci:test:angular` script already execute the complete non-watch suite.

### Summary
The initial complete suite was already green (`TOTAL: 456 SUCCESS`), so no
production regression or stale assertion repair was necessary. The existing
`AppComponent` spec asserts application-shell creation rather than a
scaffold-era title. A repository-wide Angular spec audit found no `fit`,
`fdescribe`, `xit`, or `xdescribe` exclusions and no test changes were
needed. No browser validation was required because production browser
behavior was not changed.

### Task-specific validation performed
Passed:

- `npm run test:ci --workspace mercurion_web_ng` — complete Angular suite,
  `TOTAL: 456 SUCCESS`, exit 0.
- Repeated `npm run test:ci --workspace mercurion_web_ng` after updating this
  recipe — `TOTAL: 456 SUCCESS`, exit 0.
- `npm run ci:lint:angular` — exit 0; existing lint warnings only.
- `npm run ci:typecheck:angular` — exit 0.
- `npm run ci:build:angular` — Angular build and chemistry lazy-boundary
  check passed; existing non-fatal bundle/CommonJS warnings only.
- Focused-exclusion audit over `MercurionWebNg/src/**/*.spec.ts` — zero
  `fit`, `fdescribe`, `xit`, or `xdescribe` matches.

### Full pre-merge CI-parity validation
The canonical root CI interface already contains
`ci:test:angular: npm run test:ci --workspace mercurion_web_ng`, and the
base SHA's exact CI run passed the complete aggregate validation on Windows
and Ubuntu. Local `npm run ci:check` was intentionally not run per policy.

### Browser validation performed
Not applicable: no production code or browser-visible behavior changed.

### Commits
Pending task-notes commit.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
