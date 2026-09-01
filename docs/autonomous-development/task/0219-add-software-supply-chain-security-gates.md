# 0219 - Add software supply-chain security gates

- [ ] DONE
- [ ] BLOCKED

## Objective

Make secret, dependency, license, SBOM and final-image vulnerability checks mandatory CI gates and produce verifiable digest-bound signatures/attestations for release-candidate artifacts without deploying them.

Source: `QA-033` in Series `0001`.

## Context

The repository has no declared aggregate supply-chain policy even though it builds multiple npm projects and application images. Task `0209` already proves the Nest final-image inventory, while `0202` supplies canonical orchestration and `0218` makes that aggregate status required. This task consolidates source, dependency, action and image controls under one version-controlled policy, with bounded exceptions and artifact identity tied to `0214`. It must not expose discovered secrets or require production publication to verify signing.

## Relevant files and modules

- root/project package manifests and canonical lockfile(s)
- `.github/workflows/` and referenced third-party actions
- canonical Dockerfiles/final image targets
- build identity and image digests from `0214`
- SBOM/image evidence from `0209`
- repository security/license/vulnerability policy and exception registry
- GitHub Actions permissions/OIDC/attestation configuration
- canonical CI aggregate and artifact retention

## In scope

- Scan tracked source/configuration and relevant Git history/diffs for committed secrets with redacted diagnostics.
- Scan every maintained dependency graph for known vulnerabilities and license policy violations.
- Generate a standard machine-readable SBOM for each release-candidate application artifact/image.
- Scan each exact final image digest for OS and application-package vulnerabilities.
- Pin and least-privilege the CI/action supply chain used to perform security checks.
- Sign/attest release-candidate artifacts by digest using an approved CI identity/trust root and verify them before success.
- Define narrow owner/expiry/remediation metadata for any temporary vulnerability/license exception.
- Register all blocking security results in the canonical aggregate status.

## Out of scope

- Do not deploy or publish a production release/image.
- Do not print, upload or preserve the value of a discovered secret in logs/artifacts.
- Do not rewrite Git history or rotate/revoke credentials without explicit incident authority; block and request the required response.
- Do not treat `npm audit` alone as evidence for final container OS/application contents.
- Do not ignore a scanner failure or unavailable vulnerability database and report the security gate green.
- Do not invent a legal license approval when the repository policy/owner has not classified it.

## Decisions already made

- Committed secrets are always blocking and diagnostics disclose only path/type/fingerprint-safe metadata.
- Vulnerability/license thresholds and allowed licenses are version-controlled; unwaived blocking findings fail CI.
- At minimum, unwaived Critical known vulnerabilities are blocking; any stricter severity/SLA policy and license classification must be explicit rather than implicit.
- Exceptions identify exact package/image/finding, owner, rationale, compensating control and finite expiry/remediation trigger.
- SBOM, signature and provenance/attestation bind to the immutable artifact digest and `0214` build identity.
- Third-party workflow actions and security tools are version-pinned and run with least privilege.

## Requirements

1. Inventory all npm workspaces/manifests, workflow actions, final image targets and distributable artifacts that belong to the repository supply chain.
2. Add a deterministic secret scanner for the tracked tree plus appropriate commit/PR range, with synthetic test-secret fixtures and redacted failure output.
3. Add dependency vulnerability and license scans for every maintained workspace/lockfile and normalize results against one version-controlled policy.
4. Generate SPDX or CycloneDX SBOMs for each release-candidate application artifact/image and attach release version, source revision and final digest metadata.
5. Scan every exact final image digest, including OS and application packages, and reject results that refer only to a mutable tag or builder stage.
6. Define the blocking severity/license policy and time-bounded exception schema; validate owner/expiry/finding identity and fail on expired, stale or overly broad waivers.
7. Pin third-party Actions by immutable revision, minimize job/token permissions and prevent untrusted PR code from receiving signing/publishing credentials.
8. Configure approved digest-bound signing/provenance in an isolated release-candidate workflow or job and verify signature/attestation against the configured trust identity before success.
9. Upload bounded redacted scan reports, SBOMs and verification evidence with appropriate retention; never upload secret values or credential-bearing config.
10. Compose all blocking results into canonical `ci:check`/Actions aggregate and prove failed, skipped, timed-out or scanner-unavailable states cannot resolve green.

## Acceptance criteria

- [ ] Secret, dependency, license and exact-final-image vulnerability scans are mandatory and fail closed.
- [ ] Every release-candidate application artifact/image has a digest-bound standard SBOM and build identity.
- [ ] Release-candidate signatures/attestations verify against the approved CI identity/trust root and exact digest.
- [ ] Third-party Actions are immutable-pinned and security/signing jobs use least privilege.
- [ ] Every exception is exact, owned, justified and finite; expired/stale/broad exceptions fail CI.
- [ ] Security reports are actionable and redacted, and no production deployment/publication occurs.

## Validation

Run all scanners against the real repository/artifacts and synthetic secret/vulnerability/license fixtures, inspect redaction and fail-closed behavior, generate SBOMs, sign/attest and verify isolated release-candidate artifacts by digest, test an expired waiver and invalid signature, then run repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a real secret is detected pending owner-led rotation/incident handling, a blocking vulnerability has no safe remediation or approved finite waiver, license policy/ownership is missing, or no approved signing identity/trust root is available. Do not expose the finding or weaken the gate.

## Dependencies

- `0202-complete-canonical-github-actions-ci-pipeline.md`, `0209-minimize-production-container-runtime-dependencies.md` and `0214-centralize-release-version-and-build-identity.md` must be `DONE`.
- `0218-protect-develop-with-required-pr-and-ci-policy.md` must be `DONE` so the aggregate security result is enforced on integration.

## Implementation notes

Keep policy separate from scanner-specific output so tools can change without silently changing risk semantics. Verification must begin from the artifact digest and trusted identity, never from a mutable tag alone.

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
