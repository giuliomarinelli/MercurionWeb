# 0206 - Make container builds lockfile-reproducible

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Make every maintained Node-based container build install dependencies with immutable lockfile semantics so image builds are reproducible and fail when a package manifest and lockfile diverge.

Source: `QA-020` in Series `0001`.

## Context

The audited Nest Dockerfiles use `npm install` even though a committed lockfile exists. That permits dependency resolution and lockfile mutation to differ between local CI and container builds. The permanent baseline establishes the root workspace/lockfile and canonical `npm ci` contract; `0008`/`0202` extend the CI interface. Container stages must obey the same contract before their duplicated Dockerfiles are consolidated by `0208`.

## Relevant files and modules

- `MercurionWebNode/Dockerfile`
- `MercurionWebNode/Dockerfile.staging`
- `MercurionWebNode/Dockerfile.test`
- `MercurionWebNg/Dockerfile`
- `MercurionWebNg/Dockerfile.staging`
- `MercurionWebNg/Dockerfile.test`
- active repository-built Node image definitions discovered from Compose/Kubernetes configuration
- root/project `package.json` and canonical lockfile(s)
- container-build scripts and `.github/workflows/ci.yml`

## In scope

- Inventory every maintained Docker build stage that installs npm dependencies.
- Replace mutable `npm install` behavior with the repository's canonical `npm ci` contract.
- Copy package manifests/lockfiles into dependency stages before source where build caching permits.
- Make missing, stale or modified lockfiles fail the image build.
- Pin the supported Node/npm toolchain consistently with local and Actions CI.
- Verify development, test, staging and production build targets use the correct dependency mode without resolving a new tree.
- Add clean container-build validation to canonical CI.

## Out of scope

- Do not regenerate a lockfile inside an image build.
- Do not use `--legacy-peer-deps`, `--force`, ignored lifecycle failures or registry fallbacks merely to make installation pass.
- Do not redesign Dockerfile topology here; `0208` owns consolidation.
- Do not minimize the final runtime dependency tree here; `0209` owns runtime-image contents.
- Do not bake registry credentials, tokens or private npm configuration into image layers.

## Decisions already made

- The committed canonical lockfile(s) are immutable inputs to every image build.
- Container builds use the same pinned Node/npm compatibility contract as local CI.
- Dependency installation failure is a real build failure, not a reason to fall back to mutable resolution.
- Build cache may accelerate installation but is never treated as dependency truth.

## Requirements

1. Enumerate every Dockerfile/stage invoking npm and record its build context, manifest and lockfile source.
2. Replace dependency resolution with `npm ci` using the workspace/project topology established by `0001`; use production omission only in a stage whose intended dependency set is explicitly production-only.
3. Ensure Docker build contexts and `.dockerignore` rules include the exact required manifest/lockfile and exclude local `node_modules`.
4. Pin/use the supported Node and npm versions consistently across Docker, local tooling and GitHub Actions.
5. Prove a deliberately mismatched manifest/lockfile fixture makes every affected build path fail without changing the working tree.
6. Prove a clean build from empty Docker cache resolves the committed dependency tree and leaves all tracked lockfiles unchanged.
7. Preserve necessary lifecycle steps such as verified `patch-package` application; do not suppress their failure.
8. Add a matrix or equivalent canonical CI command that builds every maintained application target affected by this contract.

## Acceptance criteria

- [ ] No maintained Node-based Docker build uses `npm install` to resolve application dependencies.
- [ ] Clean image builds consume only committed lockfile resolutions.
- [ ] Manifest/lockfile drift makes the relevant image build fail.
- [ ] Container and canonical CI use compatible pinned Node/npm versions.
- [ ] Local `node_modules`, credentials and mutable npm state cannot enter image layers.
- [ ] All affected clean container-build targets pass in canonical CI and do not modify tracked files.

## Validation

Build every affected target once without cache, run the manifest/lockfile mismatch negative fixture, inspect build history/context for leaked local dependency state, verify `git diff --exit-code` after builds, then run repository-wide CI parity.

## Browser validation

Not applicable to dependency installation itself. Runtime smoke behavior is covered by `0207` and the image matrices introduced by later container tasks.

## Stop conditions

Mark `BLOCKED` if the workspace migration left more than one conflicting canonical lockfile contract or a required private registry cannot be accessed by CI without an approved secret-delivery mechanism; do not embed credentials or fall back to mutable installs.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` must have established the final workspace/package/lockfile topology.
- `0008-enforce-nest-graphql-schema-drift-check.md` defines canonical clean-install semantics.
- `0202-complete-canonical-github-actions-ci-pipeline.md` must be `DONE` and consume the container-build matrix.

## Implementation notes

Keep the cache boundary deterministic: package metadata should invalidate dependency layers, while unrelated source edits should not force resolution of a different tree.

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

- Direct terminal prerequisite(s): `0008` (SYS-008, BLOCKED), `0202` (QA-016, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0206 QA-020 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
