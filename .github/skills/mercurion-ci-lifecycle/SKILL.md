---
name: mercurion-ci-lifecycle
description: Run Mercurion exact-SHA GitHub Actions and protected pull-request integration lifecycle. Use by the session coordinator for baseline certification, feature CI repair, reviewed merge-commit integration, post-merge verification, revert PRs and branch cleanup or preservation.
user-invocable: false
---

# Mercurion CI and integration lifecycle

Read `docs/autonomous-development/CI-BASELINE.md` and the relevant Git lifecycle
sections of `docs/autonomous-development/PROTOCOL.md` before mutation.

## Invariants

- Correlate every Actions result to the exact expected SHA.
- A metadata or duplicate path never substitutes for a required fresh full
  baseline.
- Never merge before the final feature SHA has a successful `Required gate`.
- Integrate only through a current, green, independently approved pull request
  using GitHub's merge-commit method; never push directly to `develop`.
- Never rebase, force-push, amend evaluated integration history or bypass CI.

## State machine

1. Certify exact base SHA with fresh full Windows, Ubuntu and `Required gate`.
2. On a final feature SHA, require the selected permanent CI path.
3. Route an actionable repository-controlled failure through the configured
   bounded repair worker; do not mark `BLOCKED` on the first failure.
4. Open/update the task PR after success. If `develop` moved, merge it into the
   feature branch without rebase, rerun affected validation and exact-head CI,
   then require resolved conversations and an independent approval.
5. Merge through GitHub with a merge commit and observe the exact merge SHA on
   `develop`.
6. On merge success, delete the successful feature branch locally and remotely.
7. On merge failure or unverifiable result, freeze the feature branch, revert
   through an urgent protected PR, prove restoration and green CI, then record
   `REVERTED` through a separate metadata PR.

Transient API/watcher failure requires a fresh read of the known run or exact
SHA. It is not evidence that CI failed.

