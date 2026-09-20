# 0186 - Version and validate Redis session records

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Give every persisted Redis session record an explicit schema version and validated codec with a rolling-deploy compatibility policy so old/new application versions can coexist safely and malformed session data is rejected/cleaned observably rather than silently defaulted.

Source: `DATA-037` in Series `0001`.

## Context

`SessionService` currently writes individual hash fields with no schema version and reconstructs `ISession` manually using `parseInt`, `JSON.parse` and type guards. Parse failure returns `null`; invalid/missing provider data can fall back to `AuthProvider.Mercurion`. Adding/removing/renaming a field during a rolling deploy therefore has no negotiated compatibility rule. `0179` normalizes keys/indexes and atomic operations; this task makes the session value itself a versioned persistence contract.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/session.service.ts`
- session interfaces/DTOs
- Redis session repository introduced by `0179`
- Redis key/TTL registry
- auth/session guards and socket/session consumers
- runtime deployment/rolling-update documentation

## In scope

- Define a versioned Redis session persistence schema independent of public DTOs.
- Implement one encode/decode codec with runtime validation and typed decoded versions.
- Define N/N+1 rolling-deploy read/write compatibility and migration strategy.
- Support safe read-migrate-write or dual-read behavior for the current legacy unversioned records as needed.
- Treat malformed/unsupported records as invalid sessions with observable cleanup/quarantine behavior.
- Remove silent semantic defaults that can reinterpret corrupt data as a valid Mercurion session.
- Add compatibility/property tests across supported versions and atomic operations.

## Out of scope

- Do not redesign Redis key/index topology; `0179` owns it.
- Do not version public auth/session API payloads here; SYS-022 owns public contract versioning.
- Do not preserve indefinitely every historical Redis schema; compatibility has an explicit deployment window.

## Decisions already made

- Persisted Redis data is a schema, not an implementation detail.
- Every new record carries a schema version.
- Decode is fail-closed: invalid required fields never become a valid session via defaults.
- Rolling deploys must support the explicitly documented adjacent-version window before old codecs are removed.

## Requirements

1. Document the current legacy hash fields/types/TTL semantics as schema version `legacy`/v0 for migration purposes.
2. Define the first canonical version with required/optional fields, enum values, numeric ranges and nested `sessionDeviceInfo` validation.
3. Implement one codec/repository path used by create/get/list/validate/activate/refresh operations; remove duplicate manual parsing.
4. Store the version in the atomic record written by `0179` and include it in script/transaction validation where appropriate.
5. Define rolling upgrade order: which version writers emit, which readers accept, when lazy migration occurs and when legacy support can be removed.
6. Ensure an older instance in the supported rolling window can safely coexist with a newer writer; if necessary use expand/contract schema changes rather than immediately emitting unreadable records.
7. For malformed/unsupported records, invalidate/delete/quarantine the record and repair secondary indexes safely; emit structured metrics/logs without session secrets.
8. Add fixtures for legacy, current, next-compatible, malformed, truncated and unknown-version records plus cross-version round trips.

## Acceptance criteria

- [ ] Every newly persisted session record contains an explicit schema version.
- [ ] All reads use one runtime-validated decoder.
- [ ] Supported rolling-deploy versions can read records according to the documented compatibility matrix.
- [ ] Legacy records migrate safely or expire according to an explicit plan.
- [ ] Malformed/unknown records fail closed and are cleaned/observed without silent provider/field defaults.
- [ ] Compatibility tests prevent an incompatible schema change from shipping accidentally.

## Validation

Run session codec unit/property tests, legacy/current rolling-version integration tests against Redis, malformed-record/index-repair tests, login/refresh/revoke/session-list tests, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate login, active-session listing, refresh and logout through `http://localhost:8888` while Redis contains current-version records; rolling-version/malformed fixtures are validated at integration level.

## Stop conditions

Mark `BLOCKED` if deployment tooling cannot guarantee any bounded rolling compatibility window and zero-downtime deploy remains required, because the write/read migration strategy then needs an explicit deployment architecture decision.

## Dependencies

- `0179-make-session-redis-operations-indexed-and-atomic.md` must be `DONE`.
- BE-023/BE-024 canonical Redis key/TTL contract must be `DONE`.

## Implementation notes

Do not use the TypeScript `ISession` interface itself as the persistence validator. Persistence versions should have explicit runtime schemas/codecs and map into the domain session type only after validation.

## Execution notes

### Feature branch
`feature/DATA-037`, based on `a9fb2083328bb6a65e558af25e021247d06792f9`.

### Preflight
Unchanged task-start baseline passed. The exact supplied `develop` SHA
`a9fb2083328bb6a65e558af25e021247d06792f9` matches local `develop` and the
feature branch. GitHub Actions run `35532097293` completed successfully with
Windows, Linux, and `Required gate` green. Repository-local
`commit.gpgSign=false`; no task-owned runtime was active before the probe.

### Preflight remediation
None.

### Summary
The task is blocked by its explicit deployment-architecture stop condition
before implementation. The active deployment surfaces do not document or
enforce a bounded zero-downtime rolling compatibility window: the Kubernetes
web-node deployment has one replica and only TCP startup/liveness/readiness
probes (`k8s/beta/mercurion-web-node-deploy.yaml:7,63-77`), while the beta and
production release Compose files define services/images but no rollout,
promotion, update, or rollback compatibility policy
(`docker_sl/releases/beta/docker-compose.yml:1-28`,
`docker_sl/releases/prod/docker-compose.yml:1-28`). No existing architecture
decision establishes the required N/N+1 session-codec read/write window.
Choosing expand/contract, dual-read, or writer sequencing would therefore
invent the deployment decision that this recipe requires before its codec
contract can be implemented safely.

No application implementation was changed. Only this task's terminal blocker
metadata was added; the feature branch is preserved and frozen.

### Task-specific validation performed
Focused pre-implementation checks:

- Chrome DevTools tool-surface probe: `list_pages` succeeded without
  navigation; the dedicated persistent profile was used.
- Canonical runtime starts were issued in the required Tox21 -> Nest ->
  Angular order with live handles `tox21-DATA037`, `nest-DATA037`, and
  `angular-DATA037` before any HTTP request.
- Through `http://localhost:8888`, initial retryable `502` responses were
  observed while upstreams compiled, followed by two complete readiness rounds:
  `/health` `200/79` and `/` `200/4464` in each round.
- Fresh ordinary login was performed after an explicit logout using the local
  development test account through the login form with snapshot plus
  `fill_form`; protected server-accepted state was proved by the rendered
  authenticated dashboard (`Benvenuto Test.`).
- All three task-owned runtime processes were stopped before returning; no
  Tox21, Nest, or Angular task process remained.

### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are forbidden for autonomous
local validation. Exact base-SHA Actions run `35532097293` is green.

### Browser validation performed
Pre-implementation capability evidence only, as implementation was stopped by
the recipe's explicit architecture decision condition. The canonical origin
was `http://localhost:8888`; no direct Angular port, dummy auth, clipboard
API, script evaluation, or production state was used.

### Commits
Pending blocker-metadata commit on `feature/DATA-037`.

### Merge / CI
Not merged. The preserved feature branch must remain frozen for human review.

### Rollback
_Not applicable._

### Blocker / human decision required
Define and document the bounded zero-downtime rolling deployment architecture
for Redis session-record codec changes, including the adjacent-version
read/write compatibility matrix, writer sequencing, lazy migration/dual-read
policy, and the point at which legacy support may be removed. Do not resume
implementation until that decision is owned by deployment architecture policy.
