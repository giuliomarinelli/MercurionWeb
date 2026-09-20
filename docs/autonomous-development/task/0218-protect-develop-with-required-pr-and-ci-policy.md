# 0218 - Govern develop integration without mandatory pull requests

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Keep `develop` integration reviewable and fail-closed through isolated feature
branches, explicit merge commits, and exact-SHA CI, without imposing a protected
pull-request workflow that the repository owner did not request.

Source: `QA-032` in Series `0001`.

## Context

The original audit proposed mandatory protected pull requests. The repository
owner rejected that product/governance choice and authorized the existing
manual AI-assisted integration model instead. The technical safety goal remains
the same: no task reaches final `DONE` without exact-SHA CI before and after an
explicit merge commit.

## Relevant files and modules

- `AGENTS.md`
- `.github/agents/development-session-coordinator.agent.md`
- `.github/skills/mercurion-ci-lifecycle/SKILL.md`
- `docs/autonomous-development/PROTOCOL.md`
- `docs/autonomous-development/README.md`
- canonical GitHub Actions `Required gate`

## In scope

- Record the owner-selected integration policy in the task and source registry.
- Retain isolated feature branches, explicit merge commits, and dual exact-SHA CI.
- Remove the abandoned protected-PR implementation from the recovered branch.
- Reopen dependency skips made stale by this task becoming `DONE`.

## Out of scope

- Enabling or modifying GitHub branch protection or rulesets.
- Requiring pull requests, reviewers, CODEOWNERS, or approval gates.
- Weakening CI, force-pushing, rebasing, or writing to `master`.

## Decisions already made

- `develop` remains directly integrable by the repository owner after green
  feature-SHA CI.
- Integration uses `--no-ff --no-gpg-sign` and requires green merge-SHA CI.
- A failed post-merge run is recovered with an ordinary revert commit and CI.
- Mandatory protected pull requests are not a repository requirement.

## Human decision

The repository owner explicitly rejected mandatory protected pull requests for
this repository. Manual AI-assisted recovery uses the established lifecycle:

1. implement and validate on `feature/<Source>`;
2. require successful CI on the exact feature SHA;
3. merge into `develop` with `--no-ff --no-gpg-sign`;
4. require successful CI on the exact merge SHA;
5. revert the merge normally if post-merge CI fails;
6. delete the feature branch only after successful post-merge CI.

No branch-protection ruleset, required approval, CODEOWNERS gate, or PR-only
integration policy is part of this task.

## Requirements

1. Preserve task isolation on `feature/<Source>` and explicit merge commits.
2. Require the stable `Required gate` on both the exact feature and merge SHAs.
3. Keep the fail-safe post-merge revert lifecycle and preserved diagnostic
   branches for blocked or reverted work.
4. Ensure repository instructions and runner validation consistently describe
   direct, manual integration and do not require a protected PR lifecycle.
5. Keep force-push, rebase, history rewriting, CI bypass, and writes to `master`
   forbidden.

## Acceptance criteria

- [x] Repository policy uses isolated feature branches and explicit merge commits.
- [x] Exact feature-SHA and merge-SHA CI are mandatory before a task is final.
- [x] Failed post-merge CI requires an ordinary revert and green recovery CI.
- [x] No active workflow or repository rule requires PR approval for `develop`.
- [x] No direct-push bypass or protected-PR machinery was introduced.

## Validation

- `AGENTS.md`, `PROTOCOL.md`, the coordinator instructions, and the CI lifecycle
  skill consistently retain the manual merge lifecycle.
- GitHub ruleset inspection confirms no active PR-only protection for `develop`.
- Recent recovered tasks have exercised feature-SHA CI, explicit merge commits,
  and merge-SHA CI successfully.
- `npm run ci:validate:autonomous` validates the active runner contract.

## Browser validation

Not applicable.

## Stop conditions

Stop and preserve the branch if the active repository policy still contains a
PR-only path, if exact-SHA CI cannot be observed, or if removing the abandoned
implementation would weaken the dual-CI and revert safeguards.

## Dependencies

- `0202-complete-canonical-github-actions-ci-pipeline.md` must be `DONE` and
  expose the stable aggregate `Required gate`.
- All mandatory gates through `0217` must be registered in that aggregate.

## Execution notes

### Recovery

The earlier blocked attempt implemented a protected-PR transition that was not
an owner requirement. During direct human recovery, current `develop` was merged
into the preserved `feature/QA-032` branch without rewriting history, and the
unwanted workflow, ruleset assertion, and PR-only policy changes were removed
from the resulting tree.

### Evidence

- The repository owner directly selected the manual feature-branch and dual-CI
  integration model and rejected mandatory protected PRs.
- GitHub ruleset `8894577` remains disabled; the mistakenly created ruleset
  `23653359` and its test PR were removed during recovery.
- `NG-024`, `QA-023`, `UI-014`, and `DATA-024` each completed the selected
  feature-SHA CI, explicit merge, and merge-SHA CI lifecycle.
- This task performs no browser-visible or production action.

### Rollback

If this metadata/policy recovery fails feature or post-merge CI, follow the
ordinary repository revert lifecycle. Do not enable branch protection as a
workaround.
