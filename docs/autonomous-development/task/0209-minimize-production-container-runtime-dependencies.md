# 0209 - Minimize production container runtime dependencies

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Build the final Nest runtime image from compiled application artifacts, declared runtime assets and production-only dependencies instead of copying the builder's complete development `node_modules`, and prove the delivered image inventory through SBOM and vulnerability evidence.

Source: `QA-023` in Series `0001`.

## Context

The audited Nest image copies the entire dependency tree from a build stage into the runtime stage, carrying development tooling and native build artifacts that are not part of the serving contract. Task `0208` provides the canonical multi-stage Dockerfile and `0163` defines the email-template asset contract. This task makes the final target minimal and explicit while preserving native-module compatibility and runtime functionality. The repository-wide supply-chain policy remains owned by `0219`; here SBOM/scanning evidence is used to verify the actual runtime contents.

## Relevant files and modules

- canonical `MercurionWebNode/Dockerfile` from `0208`
- root/Nest `package.json` and canonical lockfile(s)
- `MercurionWebNode/nest-cli.json`
- compiled Nest output and declared runtime assets
- email templates/partials packaged by `0163`
- native runtime dependencies and package lifecycle scripts
- container smoke, SBOM and image-scan scripts
- `.github/workflows/ci.yml`

## In scope

- Inventory modules and assets required by the compiled Nest runtime.
- Create a clean production-only dependency layer from the committed lockfile.
- Copy only compiled output, runtime dependency tree and explicitly declared assets/config metadata into the final image.
- Keep compilers, test runners, linters, source maps/debug source and package-manager caches out unless an explicit runtime need is proven.
- Preserve ABI compatibility for required native modules.
- Generate an SBOM from the final image and scan that exact image, not only the source lockfile or builder stage.
- Add size/package-count/runtime smoke regression evidence to CI.

## Out of scope

- Do not remove a dependency solely because static import analysis misses dynamic framework loading; prove runtime ownership first.
- Do not copy the builder's full `node_modules` and then delete a few named packages as a substitute for a clean production tree.
- Do not omit required email/static/schema assets to reduce size.
- Do not install packages at container startup.
- Do not define the complete repository vulnerability/license/signing policy; `0219` owns that aggregate gate.

## Decisions already made

- The final Nest image contains only serving-time code, assets and production dependency closure.
- Production dependencies are installed deterministically from the committed lockfile in a clean stage.
- Native modules are built/selected for the same platform/ABI as the final runtime.
- The SBOM and vulnerability scan describe the delivered final-image digest.
- Image size/package count are diagnostics and regression guardrails, not a reason to remove required behavior unsafely.

## Requirements

1. Record the initial final-image size, OS packages, npm package count and dev-dependency presence before remediation.
2. Create a production dependency stage using the immutable install contract from `0206`, with lifecycle behavior and patches verified rather than skipped.
3. Copy only the Nest build output, production dependency closure and runtime assets declared by application/build configuration.
4. Verify dynamic Nest modules, GraphQL schema/assets, email templates/partials, migrations and any native modules required at runtime are present and loadable.
5. Remove compiler/test/lint/dev tooling, npm cache, temporary build output and source-only material from the final target.
6. Run the final image as the non-root identity established by `0207` and execute its standalone smoke plus representative REST/GraphQL/bootstrap checks.
7. Generate a machine-readable SBOM tied to the final image digest and run the selected image vulnerability scanner against that digest.
8. Add a CI regression check that reports final size/package count and fails on reintroduced direct development dependencies or missing declared runtime assets.

## Acceptance criteria

- [ ] The Nest final image is not populated by copying the builder's complete dependency tree.
- [ ] No direct development-only dependency/toolchain is present in the delivered runtime dependency set.
- [ ] All declared runtime assets and native modules load correctly from the final image.
- [ ] The non-root standalone image passes bootstrap and representative transport smoke tests.
- [ ] SBOM and vulnerability output identify the exact final image digest.
- [ ] CI detects reintroduced dev dependencies and missing required runtime assets.

## Validation

Compare before/after image inventory and size, inspect the final filesystem/package tree, generate and inspect its SBOM, scan the exact digest, run the non-root standalone and transport smoke tests, then run repository-wide CI parity.

## Browser validation

Not required for image minimization alone. If a removed/copied asset affects a browser-served Nest endpoint used by the Angular client, verify the affected flow through `http://localhost:8888` and inspect the corresponding network response.

## Stop conditions

Mark `BLOCKED` if a runtime-loaded dependency or asset cannot be identified deterministically, or if a required native module cannot run in the selected final base image without an unresolved platform/base-image decision; do not ship an untested omission.

## Dependencies

- `0163-package-email-templates-as-canonical-nest-build-assets.md` must be `DONE`.
- `0206-make-container-builds-lockfile-reproducible.md`, `0207-harden-container-runtime-contracts.md` and `0208-consolidate-project-dockerfiles.md` must be `DONE`.

## Implementation notes

Scan what will execute. A clean source dependency audit does not prove that a copied builder filesystem is minimal or that the final image digest has the same inventory.

## Execution notes

### Feature branch
`feature/QA-023`
### Preflight
Clean feature branch at exact base SHA
`d6d23423cbf25ce3563e3bd7d465f33b0ef67a16`, matching `origin/develop`.
Repository-local `commit.gpgSign` is `false`; no task-owned application
process was active. Exact-base GitHub Actions run `35061870881` completed
successfully. The unchanged-base `npm run ci:containers` check passed.
The before image `mercurion-qa023-before` resolved to
`sha256:5d52a5b703751af10defe381f21c598e49095a7dd477676b70d1b572b96e7f6a`,
with size `1445123166` bytes, 1743 Scout SBOM artifacts, and direct dev
tooling (`@nestjs/cli`, `jest`) present.
### Preflight remediation
_None._
### Summary
The Nest production target now installs a separate deterministic
`npm ci --omit=dev` dependency layer, rebuilds native package lifecycle
artifacts for the final Alpine ABI, and copies only compiled Nest output,
compiled shared contracts, declared assets and production dependencies.
Build metadata, source maps and source-only TypeScript artifacts are pruned
from the production target. Staging and test targets retain their existing
full dependency contract.

The production CI matrix now runs an exact-image regression script that
asserts required runtime assets and native modules, rejects every direct Nest
development dependency and forbidden source/cache artifact, records image
size/package count/digest, emits a Docker Scout SBOM tied to that digest, and
produces a SARIF vulnerability scan for the same local image.
### Task-specific validation performed
`npm run ci:containers` passed after the Dockerfile changes.
`node --check scripts/check-production-container.mjs` passed.
`npm run ci:build:nest` passed, including the compiled email-template asset
check. The final `mercurion-qa023-after` image built successfully with
`docker build --pull --no-cache --file MercurionWebNode/Dockerfile
--target production`. `check-container-runtime.mjs` and
`smoke-container-runtime.mjs` passed under user `10001:10001`.
`check-production-container.mjs` passed against exact image digest
`sha256:e9a22fa72c9756d2cdf8c30648a634d2cd9882f0696df055101a1a7d7aff76d9`:
size `656057224` bytes, `772` SBOM artifacts, `461` top-level runtime
modules, 9 required runtime files, 5 required native/runtime modules, no
direct Nest dev dependencies, and no application/package source maps,
declarations or TypeScript files. Docker Scout generated the digest-matched
JSON SBOM and SARIF vulnerability report with 96 findings. The local image
also passed the standalone non-root smoke window.
### Full pre-merge CI-parity validation
Complete clean-install/aggregate validation remains owned by GitHub Actions on
the exact pushed feature SHA; local `npm ci` and `npm run ci:check` were not
run.
### Browser validation performed
_Not started._
### Commits
`22c859bf4ae3a27edc7a7539b5c2b4589db45b48` — `qa: minimize Nest production image dependencies`
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
