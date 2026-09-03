# 0187 - Make the Angular unit-test suite green

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
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
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0008` (SYS-008, BLOCKED).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0187 QA-001 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
