# 0205 - Enforce repository topology and dead-code gates

- [ ] DONE
- [ ] BLOCKED

## Objective

Make the complete maintained Angular and Nest dependency topology a deterministic CI artifact and fail on any new orphan production unit, dependency cycle or forbidden dependency edge.

Source: `QA-019` in Series `0001`.

## Context

The baseline audit found Angular and Nest orphan files and dependency cycles through ad hoc scans. Tasks `0113`, `0114`, `0115`, `0142` and `0201` establish local cycle, reachability and architecture-policy checks while removing the known violations. This task closes the repository-wide delivery gap: it composes those existing checks into one reproducible topology gate, proves that every legitimate static and dynamic entrypoint is represented and retains a reviewable graph/report for regressions. It must not introduce a second set of architectural rules that can diverge from `0201`.

## Relevant files and modules

- Angular graph/reachability tooling from `0113` and `0114`
- Nest graph/reachability tooling from `0115` and `0142`
- architecture policy/configuration from `0201`
- Angular route and lazy-action registries
- Nest application/dynamic-module entrypoints
- root package scripts and `.github/workflows/ci.yml`
- CI artifact/report configuration

## In scope

- Inventory and reuse every existing Angular/Nest cycle, orphan and forbidden-edge check.
- Define one canonical repository topology command composed from the existing project-level checks.
- Generate machine-readable and human-readable dependency/reachability reports for both applications.
- Represent legitimate lazy Angular and dynamic Nest entrypoints explicitly.
- Enforce zero unapproved production orphans and cycles and zero forbidden policy edges.
- Detect configuration drift between the standalone project checks and the repository aggregate.
- Publish bounded graph diagnostics from CI when the gate fails and a reviewable summary when it passes.

## Out of scope

- Do not create competing architectural rules already owned by `0201`.
- Do not make dead code reachable through synthetic imports or barrels solely to satisfy the scanner.
- Do not hide known or new findings behind broad directory exclusions, wildcard allowlists or an accepted non-zero cycle baseline.
- Do not treat generated, test, catalog or tooling code as production without classifying its real entrypoint domain.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Earlier project-level graph and architecture checks remain the source of rule semantics.
- The repository aggregate composes those checks and fails if any constituent is skipped or disagrees with its configuration.
- Maintained production code has a zero baseline for unapproved orphans, cycles and forbidden edges.
- Dynamic entrypoints and exclusions are explicit, path-specific and documented.
- Graph reports are diagnostics; a report artifact without a failing gate is insufficient.

## Requirements

1. Inventory the commands/configuration produced by `0113`, `0114`, `0115`, `0142` and `0201`, eliminating duplicate implementations only where their semantics are equivalent.
2. Define one root command such as `ci:topology` that runs the Angular and Nest cycle/reachability/policy checks and returns non-zero if any required constituent fails.
3. Validate that Angular routes, lazy action loaders and other approved dynamic imports are modeled as real edges without adding eager imports.
4. Validate that Nest bootstrap, modules, dynamic providers/controllers/resolvers and test-only application roots are classified in the correct graph.
5. Encode all exclusions/extra entrypoints in version-controlled configuration with exact path, category and rationale; reject unknown or stale entries.
6. Produce deterministic JSON plus concise text/graph summaries containing the violating path/edge and the entrypoint from which reachability was evaluated.
7. Add negative fixtures for an orphan, a cycle and a forbidden edge, and prove the aggregate fails for each without modifying production source during the check.
8. Register `ci:topology` in canonical `ci:check` and publish its bounded reports through the existing Actions pipeline.

## Acceptance criteria

- [ ] One canonical root topology gate covers both Angular and Nest.
- [ ] Maintained production graphs contain zero unapproved orphans, cycles and forbidden dependency edges.
- [ ] Legitimate lazy/dynamic entrypoints are modeled without artificial eager imports.
- [ ] Exclusions and entrypoints are narrow, named, justified and checked for staleness.
- [ ] Representative orphan/cycle/forbidden-edge fixtures each make the gate fail.
- [ ] CI retains actionable graph diagnostics and cannot report green when a constituent was skipped.

## Validation

Run each project-level graph checker, the canonical repository topology command and all negative fixtures; compare their outcomes/configuration, inspect the produced reports, then run repository-wide CI parity.

## Browser validation

Not required solely for topology reporting. If resolving an unexpected residual orphan or edge changes a lazy Angular entrypoint, regression-test the affected route/action through `http://localhost:8888` and verify that no lazy chunk fails to load.

## Stop conditions

Mark `BLOCKED` if an apparent orphan/cycle depends on an undocumented runtime loading mechanism or unresolved ownership decision that cannot be represented from earlier task contracts; do not suppress the finding or delete the unit speculatively.

## Dependencies

- `0113-enforce-an-acyclic-angular-import-graph.md` and `0114-remove-or-own-orphan-angular-modules.md` must be `DONE`.
- `0115-break-nest-domain-module-dependency-cycle.md` and `0142-remove-or-own-orphan-nest-modules.md` must be `DONE`.
- `0201-add-architecture-policy-tests.md` must be `DONE` and remains authoritative for forbidden-edge policy.
- `0202-complete-canonical-github-actions-ci-pipeline.md` must be `DONE` and publish the resulting diagnostics.

## Implementation notes

Prefer a thin aggregate over a new universal analyzer. The task succeeds when the earlier specialized checks form one truthful, non-skippable repository gate with useful evidence.

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
