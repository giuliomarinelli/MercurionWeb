# 0198 - Enforce risk-based coverage gates

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Turn code coverage into a non-regressing CI quality gate with stronger branch/function expectations for auth, session, transaction and mapper code, published reports and an explicit narrowly justified exclusion policy.

Source: `QA-012` in Series `0001`.

## Context

The repository currently has coverage commands but no documented threshold standard that prevents high-risk branches from remaining untested or coverage from regressing. Tasks `0189`–`0197` add substantial behavioral, integration and system coverage. This task measures the resulting honest baseline and converts it into risk-aware thresholds without gaming metrics through broad exclusions or low-value line execution.

## Relevant files and modules

- Angular test/coverage configuration
- Nest Jest coverage configuration in `MercurionWebNode/package.json`
- auth/session/MFA modules
- Unit of Work/transaction/outbox/persistence mappers
- contract/value-object mappers/codecs
- CI scripts/workflow
- coverage artifact/report configuration

## In scope

- Generate branch/function/line/statement coverage for Angular and Nest maintained production code.
- Define stronger per-path/per-module coverage gates for security/transaction/mapping code than for low-risk presentation/glue code.
- Establish thresholds from the post-QA behavioral-test baseline with an explicit default floor of 80% branch and 80% function coverage for designated high-risk modules unless the measured baseline is already higher.
- Ratchet higher existing whole-percentage baselines rather than lowering them to the default floor.
- Publish human-readable and machine-readable coverage reports in CI.
- Define an explicit exclusion list with file-level rationale and review ownership.
- Prevent thresholds/exclusions from being weakened merely to make CI green.

## Out of scope

- Do not demand 100% global coverage regardless of value.
- Do not count generated/vendor/build artifacts as maintained production source.
- Do not exclude difficult business/security branches solely because they reduce the percentage.
- Do not substitute coverage percentage for behavioral assertions or integration tests.

## Decisions already made

- Branch/function coverage matters more than line-only coverage for high-risk state/policy code.
- High-risk modules have an 80% branch/function floor unless the honest measured baseline is higher, in which case the higher baseline is retained.
- Coverage gates ratchet upward/non-regressively; they are not routinely lowered after failures.
- Every exclusion is named and justified rather than hidden in broad globs.

## Requirements

1. Generate baseline coverage after `0189`–`0197` are complete and identify high-risk modules for auth/session/MFA/transactions/outbox/mappers/codecs.
2. Configure per-project/global thresholds plus stricter file/path thresholds for the designated high-risk areas.
3. For each high-risk path, choose the greater of the 80% branch/function floor and the current rounded-down whole-percentage baseline unless an explicit documented exception is approved.
4. Define and document legitimate exclusions such as generated artifacts/entrypoint boilerplate that cannot carry meaningful unit behavior.
5. Fail CI when a threshold regresses or a new uncovered high-risk file falls outside the configured policy.
6. Publish HTML/LCOV/Cobertura or equivalent useful reports as CI artifacts and surface summary metrics in job output.
7. Keep coverage collection deterministic across local CI-parity and GitHub Actions.
8. Document the ratcheting process for intentionally raising thresholds after coverage improvement.

## Acceptance criteria

- [ ] Angular and Nest coverage reports are reproducible and published by CI.
- [ ] Auth/session/transaction/mapper high-risk paths meet configured branch/function gates of at least 80% unless an approved explicit exception exists.
- [ ] Existing higher honest baselines are not lowered to 80%.
- [ ] Generated/vendor exclusions are explicit and broad production-code exclusions are absent.
- [ ] Coverage regression makes canonical CI fail.
- [ ] Threshold changes are reviewable and documented.

## Validation

Run Angular and Nest coverage commands from clean state, inspect high-risk file metrics and exclusion behavior, deliberately verify the threshold fails on a controlled uncovered branch if practical, then run repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if coverage instrumentation itself materially changes/breaks runtime tests and the issue cannot be isolated, or if a proposed exception for a high-risk path requires human approval because meaningful testing is not currently feasible.

## Dependencies

- `0189`–`0197` should be `DONE` so thresholds represent the improved test suite rather than known test debt.
- `0008` canonical CI interface must be available.

## Implementation notes

Coverage is a floor, not proof of correctness. Keep the strongest assertions in behavior/integration tests and use the gate to make accidental untested branching visible.

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
