# 0218 - Protect develop with required PR and CI policy

- [ ] DONE
- [ ] BLOCKED

## Objective

Protect `develop` so changes enter only through an approved pull request whose canonical aggregate quality gate is green, with direct pushes and failed-check merges rejected by GitHub.

Source: `QA-032` in Series `0001`.

## Context

The Series requires PR, review and all quality gates for `develop`, while the bootstrap autonomous-development protocol initially integrates tasks by locally merging `feature/<Source>` and pushing `develop` directly. Enabling protection without first changing that lifecycle would strand the runner or encourage a bypass. This task is therefore a controlled governance transition: update the runner/policies to PR-backed integration and revert handling, then enable and verify GitHub branch protection/rulesets. Subsequent tasks must use the protected lifecycle; the automation must not receive a direct-push bypass.

## Relevant files and modules

- GitHub branch-protection/ruleset configuration for `develop`
- canonical aggregate status from `.github/workflows/ci.yml`
- `AGENTS.md`
- `docs/autonomous-development/PROTOCOL.md`
- `docs/autonomous-development/README.md`
- session/runner integration and report logic
- repository governance/runbook and `CODEOWNERS`/review ownership if present
- GitHub ruleset/status-check verification scripts

## In scope

- Resolve the exact canonical aggregate check name and confirm it reports truthfully on PR heads and `develop` merge commits.
- Change autonomous task integration from direct `develop` pushes to per-task PRs with merge-commit semantics.
- Change post-merge CI rollback from direct revert push to a blocking revert branch/PR lifecycle compatible with protection.
- Require at least one eligible approving review and successful required checks before merge.
- Require the PR head to be validated against the current `develop` state.
- Block direct pushes, force pushes, deletions and merges with failed/pending required checks.
- Enable the rule through an authorized GitHub repository-settings operation and read it back.
- Verify allowed and rejected paths safely and document the protected workflow.

## Out of scope

- Do not change or protect `master` as part of this task unless separately authorized.
- Do not grant the autonomous runner/admin/bot a bypass that recreates direct push.
- Do not reduce review count, dismiss required checks or permit force-push to keep sessions unattended.
- Do not use a fake required check that can report success without all canonical constituents.
- Do not test rejection by risking an unwanted commit on `develop`; use ruleset evaluation/read-back or an equivalent temporary protected test branch.

## Decisions already made

- `develop` accepts changes only through pull requests.
- A merge requires at least one approval from an eligible reviewer and the canonical aggregate CI status green for the current revision.
- Autonomous tasks retain one `feature/<Source>` branch and use a GitHub merge commit; rebase/squash/history rewriting remain forbidden.
- The exact `develop` merge SHA still receives post-merge CI before a task's `DONE` state is final and before its feature branch is deleted.
- If post-merge CI fails, later work stops and an ordinary revert branch/PR is opened; the failed feature branch remains preserved.
- No routine actor has a direct-push/failed-check bypass.

## Requirements

1. Identify the canonical aggregate status/context from `0202`, prove it cannot be green when any mandatory gate is failed/skipped/cancelled and keep its name stable/documented.
2. Update `AGENTS.md`, `PROTOCOL.md`, the autonomous README, runner/session behavior and reporting to open a task PR from `feature/<Source>` to `develop`, wait for checks/review, merge with a merge commit and then wait for CI on the exact merge SHA.
3. Define the protected rollback sequence: create a revert branch from current `develop`, commit an ordinary revert of the failed merge, open an urgent PR, wait for required review/checks, merge and verify the revert merge SHA green before any later task.
4. Add pre-merge stale-base handling that updates/recreates validation without rebase, force-push or history rewriting and never merges a revision not checked against current `develop`.
5. Configure a GitHub ruleset/branch protection for `develop` requiring PR, at least one approval, current required aggregate check and resolved required review state; block direct/force pushes and branch deletion.
6. Ensure the authenticated automation/service identity has only permissions needed to create branches/PRs and observe/merge approved PRs, not a ruleset bypass.
7. Transition this task itself through a human-reviewable PR path before/while protection is activated so the new lifecycle is proven without locking out recovery.
8. Read back the effective rule and safely verify rejection using non-mutating ruleset evaluation or an equivalent temporary branch; exercise one controlled PR merge path and verify post-merge CI association.
9. Add a periodic/non-mutating repository-policy assertion that detects rule or required-check drift and reports actionable differences without changing settings automatically.

## Acceptance criteria

- [ ] GitHub reports `develop` as protected by a PR-and-review rule with the canonical aggregate status required.
- [ ] Direct pushes, force pushes, deletion and merges with pending/failed required checks are rejected.
- [ ] An approved green feature PR merges with an explicit merge commit and its exact merge SHA receives post-merge CI.
- [ ] Autonomous-development policies/runner contain no remaining direct-`develop` integration or direct-revert push path.
- [ ] Post-merge failure blocks later tasks and uses a protected revert PR while preserving the failed feature branch.
- [ ] No runner/bot/admin bypass is configured as part of the normal workflow.

## Validation

Validate the updated runner/policy tests, inspect the canonical check's failure/cancel behavior, read back effective GitHub protection, exercise safe rejection on a temporary protected branch or non-mutating evaluation, complete one approved green PR/merge-commit test and associate CI with its exact merge SHA, then run repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if repository-administration permission is unavailable, no independent eligible reviewer exists, the canonical aggregate status is not stable/truthful, or the runner cannot complete PR/revert-PR lifecycle without a bypass. Do not enable a partially configured rule that locks out safe recovery, and do not weaken the source requirement to continue unattended.

## Dependencies

- `0202-complete-canonical-github-actions-ci-pipeline.md` must be `DONE` and expose the final canonical aggregate status.
- All mandatory gates through `0217` must be registered in that aggregate before it becomes required.
- The autonomous Development Session runner must exist and be testable before its integration semantics are changed.

## Implementation notes

This task intentionally changes the repository-wide integration lifecycle. After it is final, later task recipes follow PR-backed integration even where older bootstrap prose previously described a direct no-ff merge/push.

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
