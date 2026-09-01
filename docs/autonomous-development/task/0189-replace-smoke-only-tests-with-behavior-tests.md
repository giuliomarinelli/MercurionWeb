# 0189 - Replace smoke-only tests with behavior tests

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace the repository's predominance of `should be created`-style smoke specs with behavior-oriented tests that exercise public contracts, success paths and meaningful failure paths, while keeping smoke-only specs below ten percent of the maintained unit-test suite.

Source: `QA-003` in Series `0001`.

## Context

The audit found that most Angular and Nest specs prove only that a class/component can be instantiated. Those tests catch wiring failures but provide little protection for state transitions, validation, authorization, error propagation or mapping behavior. Tasks `0190`–`0193` deepen coverage for the highest-risk auth/UI/GraphQL areas; this task raises the minimum behavioral quality of the rest of the production unit-test surface without duplicating those focused suites.

## Relevant files and modules

- `MercurionWebNg/src/**/*.spec.ts`
- `MercurionWebNode/src/**/*.spec.ts`
- production components/services/guards/controllers/resolvers
- test utilities/fixtures introduced by QA tasks
- coverage configuration from `0198`

## In scope

- Inventory production specs and classify smoke-only, behavior-oriented and missing public-contract coverage.
- For public services/components/guards/controllers with existing smoke-only specs, add at least representative happy-path and error/edge behavior where the abstraction has such branches.
- Add missing unit tests for meaningful public production abstractions when they can be tested at unit level economically.
- Keep constructor/wiring smoke tests only where they add distinct value.
- Establish a machine-checkable inventory/report so smoke-only specs remain at or below ten percent rather than drifting upward.
- Prefer observable public outcomes over assertions on private methods or implementation details.

## Out of scope

- Do not duplicate the dedicated auth/session scenarios in `0190`/`0192`.
- Do not duplicate Action/accessibility scenarios in `0191` or GraphQL contract tests in `0193`.
- Do not force unit tests onto behavior that is correctly proven only by database/browser/system integration tests.
- Do not game the percentage by deleting useful specs or splitting one behavior test into many trivial cases.

## Decisions already made

- Construction alone is not sufficient evidence for a behavior-bearing abstraction.
- Tests should survive refactoring when the public contract remains unchanged.
- The smoke-test ratio is a quality signal, not a target to game.
- Complex integration semantics remain owned by the appropriate integration/E2E task.

## Requirements

1. Produce a baseline inventory of maintained production specs and identify tests whose only meaningful assertion is construction/existence.
2. Prioritize abstractions with branching, state, validation, authorization, transformation or error handling.
3. For each migrated spec, exercise observable public behavior with controlled collaborators and deterministic data.
4. Cover at least one meaningful failure/edge path whenever the public abstraction exposes one.
5. Remove redundant scaffold-only specs after equivalent or stronger behavioral coverage exists.
6. Add a lightweight static/reporting gate that detects regression of the agreed smoke-only ratio without classifying generated/vendor tests.
7. Coordinate with `0190`–`0193` so focused suites count as the behavioral replacement rather than duplicating them.

## Acceptance criteria

- [ ] Smoke-only specs represent no more than ten percent of maintained production unit specs.
- [ ] Public behavior-bearing services/components/guards/controllers have meaningful success and failure coverage at the appropriate test layer.
- [ ] Tests assert public outputs/state/effects rather than private implementation mechanics.
- [ ] No useful test was deleted solely to improve the ratio.
- [ ] The ratio/inventory is reproducible and protected from regression.

## Validation

Run the complete Angular and Nest unit suites, the smoke-test inventory/gate, coverage generation, lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not required for this repository-wide unit-test task; browser-specific behavior is covered by `0195` and focused UI tasks.

## Stop conditions

Mark `BLOCKED` if a public behavior cannot be tested without first resolving an undocumented product contract or if the only safe verification belongs to a later integration/system task and no meaningful unit boundary exists.

## Dependencies

- `0187` and `0188` must establish green trustworthy test runners first.
- `0190`–`0193` may satisfy the high-risk portions of this inventory as they become `DONE`.

## Implementation notes

Do not equate line execution with behavioral coverage. A small number of strong contract tests is preferable to dozens of assertions that mirror implementation statements.

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