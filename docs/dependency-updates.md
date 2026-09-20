# Governed dependency updates

Dependabot is the repository's only update automation. It targets `develop`
and covers the root npm workspace/lockfile, the independent MercurionData and
MercurionLandingFactory lockfiles, both Dockerfiles, and GitHub Actions.

Routine checks run every Monday in the Europe/Rome timezone. Security triage
starts within 24 hours for Critical, 72 hours for High, 14 days for Moderate,
and 30 days for Low findings. These are response windows, not automatic merge
deadlines. Major, runtime, security, native/scientific, patched, and framework
updates stay independently reviewable. Only compatible development-tooling
minor/patch updates may be grouped.

No update auto-merges. A maintainer reviews the diff and the exact head must
pass the canonical CI, including clean install, tests, containers, browser
journeys, patch lifecycle, build identity, and supply-chain attestation. A
stale or failing PR is updated or closed; an ignore requires an exact package,
owner, rationale, remediation trigger, and finite expiry in version-controlled
policy. Indefinite ignores are forbidden.
