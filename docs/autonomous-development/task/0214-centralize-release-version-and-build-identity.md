# 0214 - Centralize release version and build identity

- [ ] DONE
- [ ] BLOCKED

## Objective

Make one canonical release version plus one CI-generated build identity feed Angular, Nest, container labels and deployment metadata so every artifact from the same build reports the same version and commit.

Source: `QA-028` in Series `0001`.

## Context

Version values currently appear independently in package metadata, Angular environments, image labels and release configuration. Those copies can identify the frontend, backend and deployed image as different releases even when built together. The same-version system test from `0197` provides the end-to-end verification point; this task centralizes the inputs and rejects manually edited or stale replicas.

## Relevant files and modules

- root/project `package.json` and canonical lockfile(s)
- Angular `src/environments/` and runtime/build configuration
- Angular version/about/footer surface where version is displayed
- Nest release/version endpoint or module
- canonical Angular/Nest Dockerfiles and OCI labels
- Compose/Kubernetes image/version metadata
- release/build scripts and `.github/workflows/ci.yml`
- same-version system tests from `0197`

## In scope

- Select and document one repository-owned canonical release-version input.
- Generate one immutable build-identity record containing the release version and source commit SHA for a CI build.
- Inject/derive typed Angular and Nest build metadata from that record.
- Label every built application image with the same release/version/revision values.
- Make the backend endpoint and frontend version surface expose compatible build identity.
- Remove manually maintained version literals from environments and release/build configuration.
- Add drift/reproducibility and same-version gates to canonical CI.

## Out of scope

- Do not publish a release, create/push a tag or deploy artifacts.
- Do not use timestamps or mutable branch names as the sole build identity.
- Do not expose dirty working-tree contents, credentials or private CI metadata in public version responses.
- Do not conflate independent dependency/package versions with the product release unless the canonical policy explicitly derives them.
- Do not allow frontend/backend/image version overrides that bypass the canonical record.

## Decisions already made

- Exactly one version input is manually release-controlled; all other product-version representations are derived.
- Source commit SHA is part of build identity and is captured once by the build orchestrator.
- Angular, Nest and images built in one pipeline consume the same immutable identity artifact.
- Version endpoints/UI expose only safe release/revision data.
- Any tracked generated version artifact is deterministic and protected by a drift check.

## Requirements

1. Inventory every product version/build identifier in package manifests, environments, source, image labels, release config and deployment manifests and classify canonical versus derived metadata.
2. Define the canonical release version format/source and a typed build-identity schema containing at minimum release version and full source revision.
3. Generate the identity once per clean build and make Angular/Nest builds consume it without independent fallback literals.
4. Expose the same identity through the canonical Nest version endpoint and the existing/appropriate Angular version surface, with a stable public DTO.
5. Add OCI image labels for version, revision and source to every application image from the same record; propagate the matching image reference into deployment rendering.
6. Remove duplicated environment/package/release-config version literals or make them generated projections checked for drift.
7. Add tests proving an Angular artifact, Nest artifact and image set built together report the same version/revision and that a mismatched fixture fails.
8. Register build-identity generation/drift and same-version verification in canonical CI, retaining the identity artifact for downstream jobs.

## Acceptance criteria

- [ ] One repository input owns the product release version.
- [ ] Angular, Nest and application images from one CI build expose identical release version and source revision.
- [ ] Environment/release configuration contains no independently editable product-version literal.
- [ ] OCI labels and deployment image metadata derive from the same build identity.
- [ ] A frontend/backend/image mismatch makes CI/system testing fail.
- [ ] Version responses contain no secret or unsafe CI metadata.

## Validation

Generate the build identity twice for the same version/revision and compare deterministic output, build Angular/Nest/images, inspect frontend/backend values and OCI labels, run the mismatched negative fixture plus same-version system suite, then run repository-wide CI parity.

## Browser validation

Through `http://localhost:8888`, open the UI surface that exposes build/version information, inspect its DOM and corresponding Nest response, and verify both match the built image labels/source revision with no relevant console/network errors.

## Stop conditions

Mark `BLOCKED` if multiple release streams intentionally require independent product versions or the authoritative release-version source cannot be determined from repository/release policy; do not choose a new release authority silently.

## Dependencies

- `0197-add-same-version-frontend-backend-system-tests.md` must be `DONE`.
- `0208-consolidate-project-dockerfiles.md` must be `DONE` so image labels have one owner per project.
- `0213-refresh-canonical-repository-documentation.md` must be `DONE`; update its version references as part of this task when the canonical workflow changes.

## Implementation notes

Keep release version and build identity distinct: the release version may repeat across rebuilds, while the commit revision identifies the exact source artifact.

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
_Not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
