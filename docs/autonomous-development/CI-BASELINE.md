# Permanent CI baseline

This document defines the quality control plane that must exist on `develop`
before an autonomous Development Session may create a task branch.

The baseline is intentionally separate from the numbered task workload. A
repository-wide cleanup, dependency-topology repair, or CI bootstrap is not
charged to task `0001` or to any later recipe. A session that cannot prove this
baseline stops before assigning a task outcome.

## Current package topology

The baseline owns one repository-root npm workspace containing:

- `MercurionWebNg`;
- `MercurionWebNode`.

The root `package-lock.json` is the only lockfile for those two workspaces and
the only supported install entry point is the repository root. `SYS-001` later
adds `packages/rest-contracts` to this existing topology; it does not create or
migrate the workspace itself.

`MercurionData` and `MercurionLandingFactory` are not members of this root
workspace. Their manifests, lockfiles, and dependency trees are outside this
baseline and must not be deleted or regenerated while preparing it.

The supported baseline toolchain is:

```text
Node.js 22.16.0
npm 10.9.2
```

The root and member package manifests declare this toolchain. GitHub Actions
uses the same Node.js release.

## Canonical baseline gates

The CI workflow and local preflight use one canonical root invocation:

```text
npm ci
npm run ci:check
```

Before `npm ci`, every process started by the autonomous session that can read
or execute workspace files must be stopped. In particular, Angular/esbuild and
Nest watch mode must never overlap a clean install. Runtime processes are
started only after the initial task preflight and only for declared
browser/runtime validation; they are stopped again before the final
pre-integration clean install.

The root aggregate runs non-mutating Angular and Nest lint, both explicit
typechecks, every Angular unit test, every Nest unit and E2E test, and both
builds. It begins by validating the autonomous runner contract and all 220
recipes, including every active dated session configuration. The workflow uses
the same root-owned scripts as local preflight so the two gate definitions
cannot drift.

The baseline lint policy requires zero errors and keeps existing migration
debt visible as warnings. It does not silently auto-fix source. Tasks `0199`
and `0200` later ratchet Angular and Nest lint to zero findings.

## GitHub Actions contract

`.github/workflows/ci.yml` is a permanent exact-SHA integration control
plane. It runs on pushes to `develop`, `feature/**`, and `chore/**`, on
pull requests targeting `develop` or `master`, and on manual dispatch. Every
run exposes the stable aggregate check `Required gate`, but a classifier picks
the least expensive path that preserves the evidence invariant:

| Mode | Preconditions | Validation |
|---|---|---|
| `duplicate` | An older CI run already succeeded for the identical SHA. | Reuse that exact-tree evidence; do not start the platform matrix. |
| `metadata` | The comparison base is exact-SHA green and every changed file is an allowlisted task/report Markdown file. | Classifier self-test, autonomous validators, and `git diff --check` on Ubuntu. |
| `full` | Any source, test, manifest, lockfile, workflow, agent, protocol, configuration, unknown path, missing base, or ambiguity. | Clean `npm ci` and the complete gate independently on Ubuntu and Windows. |

The duplicate check considers only older workflow run IDs. A newer run may wait
for an older in-progress run of the same SHA for at most 900 seconds, which
avoids duplicate Windows/Linux work without allowing two runs to wait on one
another. If no older run succeeds, the newer run performs its own validation.

The metadata allowlist is intentionally narrow:

```text
docs/autonomous-development/task/[0-9][0-9][0-9][0-9]-*.md
docs/autonomous-development/reports/*.md
```

A metadata run is never accepted merely because filenames look harmless: its
exact comparison base must already have successful CI. Any GitHub API,
history, classification, or validation error fails closed. The workflow does
not use trigger-level `paths-ignore`, because that could omit the stable
required check for an exact SHA.

Superseded branch runs may be cancelled, but `develop` runs are never
cancelled. Repository permissions remain read-only apart from `actions: read`
needed to locate prior runs. The workflow never deploys, publishes, auto-fixes,
or accesses production credentials.

An autonomous implementation must still pass the exact final feature-SHA
`Required gate` before merge and the exact merge-SHA gate after integration.
Local Windows validation remains necessary but is not a substitute for the
clean Linux runner. Creating a local feature branch does not itself publish an
unchanged ref; the first remote feature ref is created only after a
task-specific commit exists.

When a task changes package topology or CI itself, it must preserve continuous
`develop` coverage, the full two-platform path, feature-branch validation,
and the stable aggregate gate. The task branch's exact remote CI result is
required before its workflow change can be integrated.

## Lockfile regeneration policy

Lockfiles are generated only by the pinned npm CLI from clean dependency
trees. They are never repaired through manual JSON edits and a missing native
platform package is not papered over by adding it as an unrelated direct
dependency.

For this baseline pull request, the root lockfile must be generated by a human
on the pull-request branch after the root and member manifests are present.
Use the explicit PowerShell procedure in the pull-request description. It
deletes the root, Angular, and Nest dependency trees; deletes the root, Angular,
and Nest lockfiles; runs one `npm install` from the repository root; and proves
the result with a second clean root `npm ci` plus `npm run ci:check`.

The resulting commit adds the root `package-lock.json` and removes the obsolete
`MercurionWebNg/package-lock.json` and `MercurionWebNode/package-lock.json`.

The Linux job is the authoritative portability check. In particular, the Nest
lockfile must materialize the Linux optional native package required by
`@css-inline/css-inline`; a Windows-only dependency tree is not mergeable.

## Session startup invariant

Before any `feature/<Source>` branch is created, the coordinator must prove:

1. local `develop` is clean and exactly equals `origin/develop`;
2. `.github/workflows/ci.yml` exists at that SHA;
3. the exact `develop` SHA has a successful `CI` workflow run and successful
   `Required gate` result;
4. root `npm ci` and `npm run ci:check` also pass locally;
5. no session-owned runtime/watcher is active during `npm ci`;
6. no required capability or decision is missing.

Failure of this invariant is a session-level startup failure. It must not mark
the first pending recipe `BLOCKED` or `REVERTED`, create its feature branch, or
use that recipe to repair unrelated repository debt.
