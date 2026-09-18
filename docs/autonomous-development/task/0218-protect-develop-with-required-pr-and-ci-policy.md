# 0218 - Protect develop with required PR and CI policy

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
- If post-merge CI fails, later work stops, an ordinary revert branch/PR is opened, the task becomes `REVERTED` after safe rollback, and its feature branch remains preserved/frozen.
- No routine actor has a direct-push/failed-check bypass.

## Requirements

1. Identify the canonical aggregate status/context from `0202`, prove it cannot be green when any mandatory gate is failed/skipped/cancelled and keep its name stable/documented.
2. Update `AGENTS.md`, `PROTOCOL.md`, the autonomous README, runner/session behavior and reporting to open a task PR from `feature/<Source>` to `develop`, wait for checks/review, merge with a merge commit and then wait for CI on the exact merge SHA.
3. Define the protected rollback sequence: create a revert branch from current `develop`, commit an ordinary revert of the failed merge, open an urgent PR, wait for required review/checks, merge, verify the revert merge SHA green, record the original task `REVERTED`, propagate `SKIPPED_DEPENDENCY`, and verify that metadata green before any later independent task.
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
- [ ] Post-merge failure blocks integration, uses a protected revert PR, records `REVERTED`, propagates dependency skips and preserves/freezes the original feature branch.
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

`feature/QA-032` at base `b91544db325749c3aef944c3f67a34c665cbb0ff`.
The branch was already checked out, matched the supplied base, and had no
uncommitted changes before this task's status update.

### Preflight

- Confirmed `feature/QA-032` is the assigned branch and the working tree was
  clean at `b91544db325749c3aef944c3f67a34c665cbb0ff`.
- Confirmed local `develop` is also at
  `b91544db325749c3aef944c3f67a34c665cbb0ff`.
- Confirmed repository-local `commit.gpgSign=false`.
- Confirmed no task-owned Angular, Nest, Tox21, test-watcher, or workspace
  process was active before the status-only change.
- Exact base CI evidence is green: GitHub Actions CI run `35141711090`
  completed successfully for
  `b91544db325749c3aef944c3f67a34c665cbb0ff` at
  `https://github.com/giuliomarinelli/MercurionWeb/actions/runs/35141711090`.
  `Prerequisites (windows-latest)`, `Prerequisites (ubuntu-latest)`, and
  `Required gate` all completed successfully; all other executed jobs were
  also successful.
- Read-only policy inspection found `GET
  /repos/giuliomarinelli/MercurionWeb/branches/develop/protection` returns
  `404 Branch not protected`.
- Read-only ruleset inspection found ruleset `8894577` (`Rebecca`) has
  `enforcement=disabled`, only `deletion` and `non_fast_forward` rules, no
  bypass actors, and no pull-request, approval, required-check, or
  current-branch validation rules.
- Read-only collaborator inspection found only the repository owner with admin
  permission and one additional collaborator with push permission. No
  independent eligible reviewer was confirmed as available for the required
  controlled PR/review test.
- The canonical aggregate check name was confirmed as stable `Required gate`.
- Read-only `npm run autonomous:plan -- --json` passed with no errors, cycles,
  or stale skips. Read-only `npm run ci:validate:autonomous` passed.

### Preflight remediation

None. No repository settings or ruleset mutation was attempted.

### Summary

No implementation was attempted because the task's explicit stop condition
applies: develop is unprotected and the required independent eligible
reviewer/authorized controlled PR path was not available. The task is blocked
without a bypass, fake check, direct push, or weakened review requirement.

### Task-specific validation performed

- `gh run view 35141711090 --json ...` — passed; exact base SHA and all
  required jobs were successful.
- `gh api repos/giuliomarinelli/MercurionWeb/branches/develop/protection` —
  expected stop-condition result: `404 Branch not protected`.
- `gh api repos/giuliomarinelli/MercurionWeb/rulesets` and read-back of
  ruleset `8894577` — passed; existing ruleset is disabled and incomplete for
  this task.
- `npm run autonomous:plan -- --json` — passed.
- `npm run ci:validate:autonomous` — passed.
- No direct-push, settings-mutation, rejection test, PR merge test, or
  repository-wide CI parity run was attempted because the required
  administration and independent-review prerequisites were unavailable.

### Full pre-merge CI-parity validation

Not applicable to the blocked status-only attempt. The exact green base CI
run is recorded above. Local `npm ci` and `npm run ci:check` were not run.

### Browser validation performed

Not applicable: backend/governance-only task.

### Commits

Status-only blocker commit:
`185855f2f24eef9a3c7d4cfad7a1647fd3e0b8b8`
(`docs: block QA-032 pending protected PR authority`).
This execution-note update records that commit and will be included in the
final status commit, both created with `--no-gpg-sign` and the required Copilot
co-author trailer.

### Merge / CI

No merge was performed. The feature branch remains preserved and will be
frozen after the blocker commit is pushed. No develop mutation was attempted.

### Rollback

Not applicable; no implementation or merge occurred.

### Blocker / human decision required

Repository administration must be authorized for this repository, and an
independent eligible reviewer must be available to approve and exercise the
protected PR lifecycle. The authorized operator must then configure and
read back the develop PR/review/`Required gate` protection without granting a
normal runner or bot a bypass. Until those prerequisites exist, do not enable
partial protection and do not use a direct push or fake required check.

### Manual AI-assisted recovery (2026-09-18)

- The repository owner authorized manual recovery, and collaborator
  `stefanone91` was confirmed with `write` permission as an eligible independent
  reviewer.
- Merged current green `develop` into `feature/QA-032` with an explicit
  no-fast-forward, unsigned merge before continuing the preserved branch.
- Updated the autonomous lifecycle to use protected task PRs and protected
  revert PRs, added a fail-closed repository-policy verifier, and added its
  scheduled/manual GitHub Actions workflow.
- Created and read back active repository ruleset `23653359` (`Protect
  develop`) for `develop`: pull requests only, one approval, stale-approval
  dismissal, last-push approval, resolved conversations, strict required
  `Required gate`, merge commits only, deletion and non-fast-forward changes
  blocked, and no bypass actors.
- `node scripts/check-develop-protection.mjs` passed against the effective
  GitHub configuration.
- Opened protected PR #41 from `feature/QA-032` to `develop`, requested review
  from `stefanone91`, and enabled merge-commit auto-merge without administrator
  bypass. An attempted merge before approval was rejected by GitHub as
  required.
- Exact feature-SHA `Required gate` checks passed before this final metadata
  update. This update intentionally starts a fresh exact-SHA check; PR #41
  remains unable to merge until both that check and the independent approval
  succeed. The exact merge SHA must then receive successful post-merge CI
  before this outcome is final and the feature branch may be deleted.
