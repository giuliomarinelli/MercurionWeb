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

## Planned platform migrations — 22 October 2026

The [portfolio roadmap](../MercurionWebNg/docs/portfolio-ux/ROADMAP.md#aggiornamenti-di-piattaforma-pianificati)
records the agreed migration scope and compatibility inventory:

- UP-01: Angular 20 → 21 → 22 after application completion, initially retaining
  Zone.js change detection and Karma/Jasmine. Audit Apollo Angular/Apollo Client,
  PrimeNG/CDK, ngx-quill, TypeScript and the remaining dependency tree.
- UP-02: install Node.js 26 only after UP-01 is completed and validated,
  retaining NestJS 11. This supersedes the earlier end-of-October target,
  including dedicated backend trials. Align engines,
  npm/package-manager pins, lockfile metadata, CI, containers and development
  tooling after validation. Angular 20/21 do not officially support Node 26;
  complete the Angular migration on a compatible Node 22 patch before the
  Node 26 installation and shared-workspace switch.

UP-01 also requires a dedicated migration branch, an identified legacy SHA,
repeatable legacy/migrated comparisons, and backend/database evidence for
operations whose contracts require idempotency. Passing compilation or mocked
browser journeys alone does not establish functional equivalence or durable
write idempotency. Record unexplained differences and coverage limits before
integration; the roadmap contains the detailed acceptance matrix requirements.

An Angular 20 Beta 1 after its 28 November 2026 LTS end remains a release
scenario for explicit evaluation, not an approved exception. End of support
does not automatically stop the application, but normal upstream maintenance
can no longer be relied on. The beta label does not change that status; assess
applicable vulnerabilities and a time-bounded migration plan before release.

These are planning decisions; this documentation update does not change the
current dependency versions, runtime pins or CI configuration.
