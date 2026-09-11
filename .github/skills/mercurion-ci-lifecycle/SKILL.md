---
name: mercurion-ci-lifecycle
description: Run Mercurion exact-SHA GitHub Actions and Git integration lifecycle. Use by the session coordinator for baseline certification, feature CI repair, no-FF integration, post-merge verification, revert and branch cleanup or preservation.
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
- Merge with `--no-ff --no-gpg-sign` only from unchanged synchronized
  `develop`.
- Never rebase, force-push, amend evaluated integration history or bypass CI.

## State machine

1. Certify exact base SHA with fresh full Windows, Ubuntu and `Required gate`.
2. On a final feature SHA, require the selected permanent CI path.
3. Route an actionable repository-controlled failure through the configured
   bounded repair worker; do not mark `BLOCKED` on the first failure.
4. Merge only after success, push, and observe the exact merge SHA.
5. On merge success, delete the successful feature branch locally and remotely.
6. On merge failure or unverifiable result, freeze the feature branch, revert
   the merge, prove restoration and green CI, then record `REVERTED` through
   metadata CI.

Transient API/watcher failure requires a fresh read of the known run or exact
SHA. It is not evidence that CI failed.

