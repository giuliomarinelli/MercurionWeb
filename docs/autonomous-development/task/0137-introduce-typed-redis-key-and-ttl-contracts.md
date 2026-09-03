# 0137 - Introduce typed Redis key and TTL contracts

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Replace scattered Redis key strings/namespaces and ambiguous TTL numbers with typed domain-owned key builders and one explicit duration unit contract.

Source: `BE-023` in Series `0001`.

## Context

Redis keys are currently assembled in services with raw strings such as `session:*`, `user_sessions:*`, rate-limit/lock/fingerprint/trusted-location keys, while `RedisService` accepts generic strings and methods such as `setTTL(key, ttlSeconds)`/`set(... expireSeconds)`. This makes namespace collisions and seconds-vs-milliseconds mistakes easy and duplicates key vocabulary across domains.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/redis/`
- auth/session/MFA/account services using Redis
- OAuth/SSO Redis state usage
- rate-limit configuration
- canonical config/duration values
- Redis-related tests

## In scope

- Define domain-specific typed key builders with explicit namespace ownership.
- Define a single Redis TTL duration representation/unit and conversion boundary.
- Replace production raw key interpolation for governed domains with key builders.
- Make Redis adapter APIs communicate TTL units in names/types rather than bare ambiguous numbers.
- Add collision/snapshot tests for key formats and expiry semantics.
- Document/version key namespace ownership for later session schema migration.

## Out of scope

- Do not redesign session atomicity/indexing; `DATA-030` owns that.
- Do not implement Redis record schema versioning; `DATA-037` owns that.
- Do not change lock/rate-limit business thresholds except to preserve them in the canonical duration type.
- Do not use `KEYS`/`SCAN` as a substitute for the typed key model.

## Decisions already made

- Key construction belongs to the owning domain/protocol, not arbitrary callers.
- Redis expiry uses one explicit canonical unit at the adapter boundary.
- Raw string keys are allowed only inside the key-builder/adapter implementation or narrowly documented infrastructure cases.

## Requirements

1. Inventory production Redis key prefixes and classify each by owner and data shape.
2. Create typed builders for session, auth/MFA/account lock/counter, OAuth/SSO and infrastructure namespaces in scope.
3. Introduce a named duration type/helper (for example seconds-at-Redis-boundary) that prevents accidental millisecond values.
4. Migrate callers without changing existing effective TTLs.
5. Add tests proving representative IDs/contexts cannot collide across namespaces.
6. Add static architecture/lint protection against new ad-hoc governed Redis key literals where practical.
7. Keep the public Redis adapter small; do not expose the raw client simply to bypass key/TTL contracts.

## Acceptance criteria

- [ ] Governed production Redis keys are built through typed owner-specific builders.
- [ ] TTL unit is explicit in types/API and existing expiry durations remain equivalent.
- [ ] Namespace collision tests cover all migrated domains.
- [ ] New raw key/ambiguous TTL usage is prevented by CI or architecture tests.
- [ ] DATA-030/037 can evolve storage/serialization without replacing this key vocabulary again.

## Validation

Run Redis/key-builder/session/auth tests, expiration tests with fake clock/Redis fixture, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if two active domains intentionally share a Redis key namespace/data contract but ownership cannot be determined safely.

## Dependencies

- `0124-separate-session-domain-logic-from-redis-persistence.md` should be `DONE` so repository boundaries are stable.
- canonical config duration values from `0130` must be available.

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

- Direct terminal prerequisite(s): `0124` (BE-010, SKIPPED_DEPENDENCY), `0130` (BE-016, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY -> 0137 BE-023 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
