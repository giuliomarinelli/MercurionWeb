# 0211 - Govern patch-package lifecycle

- [ ] DONE
- [ ] BLOCKED

## Objective

Make every repository-maintained `patch-package` patch reproducible, behavior-tested, traceable to an upstream issue and governed by an explicit owner/removal condition so stale or silently ineffective patches fail CI.

Source: `QA-025` in Series `0001`.

## Context

The repository currently contains Angular patches for `@rdkit/rdkit` and `minimatch` plus a Nest patch for `@as-integrations/fastify`. A patch file can silently become historical infrastructure, mask an upgrade constraint or stop applying after dependency changes. Clean install must continue to apply required patches strictly, but the repository also needs evidence of what each patch changes, why it is safe and when it must be removed.

## Relevant files and modules

- `MercurionWebNg/patches/@rdkit+rdkit+2024.3.5-1.0.0.patch`
- `MercurionWebNg/patches/minimatch+3.1.5.patch`
- `MercurionWebNode/patches/@as-integrations+fastify+2.1.1.patch`
- root/project package manifests and canonical lockfile(s)
- `patch-package` lifecycle scripts
- RDKit, minimatch consumer/build behavior and Fastify integration tests
- dependency exception/ownership documentation from `0210`
- canonical CI scripts

## In scope

- Inspect and classify every committed patch and the exact resolved package version it targets.
- Document owner, rationale, behavioral/security impact, upstream reference and removal condition for each retained patch.
- Add a focused regression test that fails without each behaviorally required patch.
- Remove any patch that is obsolete after current dependency migrations and prove the unpatched supported package passes.
- Make clean install fail when a required patch does not apply exactly.
- Detect orphan/stale patch files and dependency upgrades that invalidate patch metadata.
- Register patch application and lifecycle validation in canonical CI.

## Out of scope

- Do not edit installed `node_modules` outside deterministic package lifecycle execution.
- Do not refresh a failed patch mechanically without understanding its behavioral delta.
- Do not retain a patch merely because it still applies.
- Do not use patches as a permanent substitute for owning application code or for an available safe upstream release.
- Do not place credentials, generated binaries or unrelated vendor source in a patch.

## Decisions already made

- Every retained patch has one named repository owner and a verifiable upstream/removal path.
- Required patches apply during the canonical immutable install and fail closed.
- A focused test proves the behavior each patch supplies; patch-file existence alone is not validation.
- Package upgrades trigger patch re-evaluation before merge.
- Obsolete patches and their lifecycle hooks are removed completely.

## Requirements

1. Parse each patch, record its target package/version/files and explain the minimal behavioral delta in a version-controlled patch registry.
2. Link each retained patch to an upstream issue/PR or an explicit internal decision when no upstream project exists, including owner and removal version/condition.
3. Add a regression test or deterministic build/contract fixture per retained patch that would fail if its required delta disappeared.
4. Test clean `npm ci` in every owning workspace and configure patch application to return non-zero on mismatch/failure.
5. Add a lifecycle checker that rejects a patch with no installed target, wrong resolved version, missing registry entry/test or elapsed removal deadline.
6. Re-evaluate the three audited patches after `0210`; remove each obsolete patch and update manifests/scripts when no patches remain for a project.
7. Inspect retained patch content for unexpected generated/binary/credential material and keep the diff minimal to the declared purpose.
8. Register clean application, registry validation and focused regression tests in canonical CI.

## Acceptance criteria

- [ ] Every retained patch has exact target metadata, owner, rationale, upstream reference and removal condition.
- [ ] Each required patch has a focused regression test proving its behavior.
- [ ] Canonical clean install fails if a required patch cannot apply exactly.
- [ ] Orphan, stale, unregistered or expired patches fail CI.
- [ ] Obsolete audited patches and unused lifecycle dependencies/scripts are removed.
- [ ] Patch contents contain only the minimal reviewed source delta.

## Validation

Run clean installs for each owning workspace, patch-registry/lifecycle checks and all focused regressions; exercise a temporary mismatched/orphan fixture to prove fail-closed behavior, inspect patch contents and lockfile state, then run repository-wide CI parity.

## Browser validation

Required only for a retained/removed patch that affects browser-visible RDKit or Angular behavior. In that case exercise the affected feature through `http://localhost:8888`, inspect console/network output and verify lazy loading still satisfies the bundle gate.

## Stop conditions

Mark `BLOCKED` if the purpose or safety impact of a current patch cannot be reconstructed, its behavior cannot be tested deterministically, or removing/retaining it requires an unresolved dependency/security decision. Preserve the patch and record the required human decision rather than guessing.

## Dependencies

- `0206-make-container-builds-lockfile-reproducible.md` must be `DONE` so clean install semantics are authoritative.
- `0210-eliminate-or-govern-deprecated-dependencies.md` must be `DONE` so patches are evaluated against the intended dependency versions.

## Implementation notes

A patch registry should describe evidence, not duplicate the patch diff. Keep tests focused on the externally required behavior so an upstream fixed release can satisfy them and make patch removal obvious.

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
_Not started / as applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
