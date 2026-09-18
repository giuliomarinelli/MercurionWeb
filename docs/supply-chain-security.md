# Supply-chain security

`docs/supply-chain-policy.json` is the versioned policy. `npm run
ci:supply-chain` fails closed on tracked secrets (with values redacted), mutable
third-party Action references, denied or unclassified licenses, expired/broad
exceptions, scanner failures, and Critical production dependency advisories.

CI produces a CycloneDX workspace SBOM and a release-candidate manifest bound
to the lockfile, build version, and exact Git revision. The existing production
container gate separately produces and scans the final Nest image SBOM by image
digest. GitHub Actions attests the release-candidate manifest using its
short-lived OIDC identity and Sigstore, then verifies it against this repository
and `.github/workflows/ci.yml`. Nothing is deployed or published.

Exceptions must identify one exact finding, owner, rationale, compensating
control, and finite expiry. Wildcards and expired entries fail validation.
Secret findings must be handled by the owner without copying the value into
logs, reports, issues, or exceptions.
