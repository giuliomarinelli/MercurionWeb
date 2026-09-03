# 0220 - Automate governed dependency updates

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Configure one repository-owned dependency-update automation with explicit ecosystem coverage, SemVer/grouping policy, maintainer ownership and security-update windows so compatible updates open fully verified pull requests instead of accumulating reactively.

Source: `QA-034` in Series `0001`.

## Context

The repository contains multiple npm manifests/lockfiles, Docker base images and GitHub Actions dependencies. After `0210`/`0211` normalize legacy packages and patches, and `0218`/`0219` enforce protected PR and supply-chain gates, automated updates can be introduced without bypassing review or CI. The automation must create bounded understandable PRs, respect the canonical lockfile/patch policy and route security updates within a documented finite window.

## Relevant files and modules

- root/project `package.json` and canonical lockfile(s)
- canonical Angular/Nest Dockerfiles and other maintained base-image references
- `.github/workflows/` action references
- `.github/dependabot.yml` or the single selected repository update-bot configuration
- dependency/version/exception policy from `0210`/`0211`/`0219`
- `CODEOWNERS`, labels and maintainer/security ownership
- protected `develop` PR/required-check policy
- dependency-update runbook/reporting

## In scope

- Select/configure exactly one dependency-update automation for the GitHub repository.
- Cover every maintained npm workspace/lockfile, Docker base image and GitHub Actions dependency.
- Define routine update cadence and finite security-update windows by policy/severity.
- Separate/group updates by compatibility and risk so PRs remain reviewable.
- Apply explicit SemVer policy for patch, minor, major, prerelease and pinned toolchain updates.
- Assign owners/labels and require the complete protected CI/security gate set on every bot PR.
- Integrate patch lifecycle, deprecated-dependency and build-identity checks.
- Document triage, stale/blocked PR and exception/ignore handling.

## Out of scope

- Do not enable automatic merging unless a separate explicit repository policy authorizes it.
- Do not combine unrelated major/runtime upgrades into one opaque PR.
- Do not ignore a dependency indefinitely without owner, rationale and review/expiry condition.
- Do not let bot PRs bypass review, required checks, signed-commit/repository rules or supply-chain scanning.
- Do not update or open PRs in `../MercurionTox21` or any sibling repository.

## Decisions already made

- One bot/configuration owns updates; overlapping Dependabot/Renovate-style automation is forbidden.
- Every bot change targets `develop` through the protected pull-request lifecycle.
- Routine updates follow a documented maintenance cadence; compatible security updates open within a finite severity-based window owned by the security/maintenance policy.
- Major and other potentially breaking updates are isolated and never auto-merged.
- Low-risk related development-only patch/minor updates may be grouped; runtime, security, native/scientific and patched dependencies remain separately reviewable unless compatibility evidence justifies a narrow group.
- CI, browser/system tests where relevant and supply-chain gates decide technical mergeability; the bot never weakens them.

## Requirements

1. Inventory every maintained npm manifest/lockfile, Docker base-image reference and GitHub Action and map it to one update-manager entry.
2. Configure one GitHub-compatible update automation targeting `develop`, with labels, commit/PR naming and eligible reviewer/owner routing.
3. Encode exact routine cadence plus finite security-update SLA/windows from the approved maintenance/security policy; no placeholder such as “regularly” satisfies the gate.
4. Define SemVer rules: isolate majors, control prereleases, respect framework/toolchain compatibility and keep pinned Node/npm/Angular/Nest ranges synchronized where required.
5. Define bounded grouping rules that keep runtime/security/native/scientific/`patch-package` targets reviewable and avoid lockfile-wide unrelated churn.
6. Ensure every bot PR runs canonical clean install, full `ci:check`, container/system/browser checks as applicable and `0219` supply-chain gates under `develop` protection.
7. Integrate `0211` so an update that invalidates or obsoletes a patch fails with actionable patch-removal/rebase evidence rather than silently refreshing vendor diffs.
8. Add policy validation for duplicate ecosystem coverage, unmanaged manifests, indefinite ignores, missing owners, invalid target branch and over-broad groups.
9. Document triage for green updates, breaking majors, blocked security fixes, stale PRs and time-bounded version ignores/exceptions.
10. Validate the configuration and trigger/observe representative safe update PRs or deterministic fixtures for npm, Docker and Actions without merging or deploying them.

## Acceptance criteria

- [ ] Exactly one update automation covers every maintained npm, Docker and GitHub Actions dependency source.
- [ ] Routine cadence, security windows, SemVer behavior, grouping and ownership are explicit and machine-validated.
- [ ] Bot PRs target protected `develop` and cannot bypass review or any required CI/security gate.
- [ ] Major/high-risk/patched dependencies remain separately reviewable and no indefinite unowned ignore exists.
- [ ] Compatible security updates open within the configured policy window with actionable ownership.
- [ ] Representative npm, base-image and Action update fixtures/PRs produce bounded expected diffs and no automatic merge/deployment.

## Validation

Validate bot configuration against the complete dependency inventory, run policy negative fixtures for an unmanaged manifest, duplicate manager, indefinite ignore and over-broad group, inspect representative npm/Docker/Actions update PR diffs and required checks, then run repository-wide CI parity.

## Browser validation

Not applicable to the automation configuration itself. A bot PR that changes browser runtime/framework behavior must execute the existing browser/system validations before it can merge.

## Stop conditions

Mark `BLOCKED` if no eligible maintainer/security owner exists, routine cadence or security-update windows are not approved, repository/app authorization for the selected bot is unavailable, or an ecosystem cannot be covered without a second conflicting automation. Do not invent ownership/SLA or enable auto-merge as a workaround.

## Dependencies

- `0210-eliminate-or-govern-deprecated-dependencies.md` and `0211-govern-patch-package-lifecycle.md` must be `DONE`.
- `0218-protect-develop-with-required-pr-and-ci-policy.md` and `0219-add-software-supply-chain-security-gates.md` must be `DONE`.

## Implementation notes

Optimize for reviewable risk units, not the smallest possible PR count. The update policy should make absence of coverage and stale exceptions visible just as clearly as available upgrades.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0210` (QA-024, SKIPPED_DEPENDENCY), `0211` (QA-025, SKIPPED_DEPENDENCY), `0218` (QA-032, SKIPPED_DEPENDENCY), `0219` (QA-033, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0202 QA-016 SKIPPED_DEPENDENCY -> 0218 QA-032 SKIPPED_DEPENDENCY -> 0220 QA-034 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
