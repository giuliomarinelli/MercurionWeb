# 0204 - Enforce a code-duplication regression gate

- [ ] DONE
- [ ] BLOCKED

## Objective

Introduce a deterministic code-clone/duplication gate for maintained Angular and Nest production source, reduce the current meaningful duplication baseline and make the resulting lower threshold non-regressing in canonical CI.

Source: `QA-018` in Series `0001`.

## Context

The audit identified significant duplicated Angular and Nest implementation patterns. Earlier FE/UI/NG/BE/DATA tasks deliberately extract shared primitives, ownership policies, adapters, mappers and ordered-tree/session infrastructure, so the post-refactor repository should have a materially better duplication baseline. There is currently no explicit project-level jscpd/code-clone configuration; package-lock references alone are not a quality gate. This task measures maintained source honestly, removes the highest-value remaining clones and then ratchets the measured threshold.

## Relevant files and modules

- Angular production TypeScript/templates/styles
- Nest production TypeScript
- root/package dependency and CI scripts
- shared primitives/adapters/mappers introduced by prior tasks
- new jscpd or equivalent code-clone configuration
- `.github/workflows/ci.yml`

## In scope

- Add/pin one repository-level code-duplication tool such as jscpd and expose a deterministic root command.
- Measure maintained Angular/Nest production code with generated/vendor/build artifacts excluded explicitly.
- Classify clones by business/maintenance risk rather than blindly deduplicating all repeated syntax.
- Refactor the highest-value remaining production duplication into appropriately scoped shared abstractions without recreating mega-utils/common modules.
- Record the improved post-refactor baseline and configure CI to fail when duplication regresses above it.
- Generate a readable clone report/artifact for review.
- Support future ratcheting downward as duplication improves.

## Out of scope

- Do not treat generated GraphQL/schema/lock/vendor/dist code as maintained duplication.
- Do not add broad source exclusions merely because a clone is difficult to refactor.
- Do not move copied code into an ignored directory or stringify/generate it to game the metric.
- Do not create speculative generic abstractions when two similar pieces intentionally have different domain semantics.
- Do not require zero textual duplication if the repeated construct is clearer and semantically independent.

## Decisions already made

- The first gate baseline is measured after the major architecture/refactor tasks, not against the original technical-debt snapshot.
- Before locking the threshold, meaningful production duplication must strictly decrease from the task's initial measurement.
- The resulting threshold is non-regressing and can ratchet downward.
- Generated/vendor exclusions are explicit; maintained production source stays visible.

## Requirements

1. Add one pinned clone-detection tool/configuration and a root `ci` constituent with deterministic parser/extensions/threshold settings.
2. Include maintained Angular TypeScript/templates/styles and Nest TypeScript where the tool can compare them meaningfully; separate language groups if needed to avoid noisy cross-language clones.
3. Exclude only named generated/vendor/build paths such as `node_modules`, `dist`, coverage and generated schemas/assets, documenting each exclusion.
4. Capture the starting post-Series-refactor duplication percentage/token/clone report before changing code.
5. Rank the largest/highest-maintenance-risk clones and refactor enough real production duplication that the measured baseline strictly decreases.
6. Avoid a new generic `Utils`/`CommonService` dumping ground; shared code must have coherent ownership and API.
7. Set the CI threshold to the improved baseline (rounded conservatively so the current repository passes) and fail any later regression above it.
8. Publish the clone report or concise artifact and document how future improvements lower the baseline.

## Acceptance criteria

- [ ] A project-level clone detector runs deterministically on maintained Angular/Nest source.
- [ ] Generated/vendor/build content is explicitly excluded and production source is not broadly hidden.
- [ ] Meaningful measured duplication is lower after remediation than at task start.
- [ ] The improved baseline is encoded as a non-regressing CI threshold.
- [ ] New duplication beyond the threshold makes canonical CI fail.
- [ ] Refactoring does not introduce incoherent mega-utils or change domain behavior.

## Validation

Run clone detection before/after remediation, inspect reported clone groups and exclusions, deliberately verify a representative duplicate fixture/regression fails if practical, then run complete lint/typecheck/tests/build and repository-wide CI parity.

## Browser validation

Not required unless a deduplication refactor changes shared browser-visible UI/runtime code; in that case validate affected flows through `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if the largest reported clones are generated/false-positive patterns that cannot be excluded narrowly enough to produce a meaningful metric, or if reducing the baseline would require merging intentionally distinct domain semantics into an unsafe abstraction.

## Dependencies

- Major FE/UI/NG/BE/DATA deduplication/refactor tasks should be `DONE` so the baseline reflects the intended architecture.
- `0202` canonical GitHub Actions orchestration should be ready to consume this gate.

## Implementation notes

The metric is a guardrail, not the design goal. Prefer reducing duplicated domain decisions/maintenance hotspots; a tiny repeated declarative pattern may be safer than a generic abstraction that obscures ownership.

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