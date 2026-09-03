# 0186 - Version and validate Redis session records

- [ ] DONE
- [ ] BLOCKED
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
