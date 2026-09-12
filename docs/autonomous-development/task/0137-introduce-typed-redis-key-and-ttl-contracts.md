# 0137 - Introduce typed Redis key and TTL contracts

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-023`, based on `e1ab0477b994cba7f484ed26eb8094348e8243e9`.
Clean identity verified before editing; HEAD initially matched the supplied
base and the working tree was clean.
### Preflight
Confirmed `develop`/feature identity and local `commit.gpgSign=false`. The
exact supplied base SHA has a successful GitHub Actions CI run
(`34706111241`, `2026-09-12T16:43:41Z` to `16:44:16Z`). Dependency recipes
0124 and 0130 are both `DONE`. No task-owned Angular, Nest, Tox21, Jest
watcher, or workspace-consuming process was active. Browser validation is not
applicable.
### Preflight remediation
None. No ownership ambiguity was found: session/token/trust, authentication,
MFA, account, feedback, OAuth, and SSO namespaces have distinct owners and
data shapes. DATA-030 session indexing/atomicity and DATA-037 record
serialization remain untouched.
### Summary
Added owner-specific typed Redis key builders for all governed production
namespaces and a branded `RedisTtlSeconds` contract with seconds/minutes/
hours/days conversion helpers. Migrated session, token/trust, auth/MFA/account
lock/counter, feedback, OAuth, and SSO callers while preserving effective
expiry values. Redis adapter key and TTL APIs now require the contract types;
counter, TTL, set-membership, unlink, and NX-set operations no longer require
callers to access the raw client. Added namespace collision/format and expiry
tests plus a CI static guard against new governed raw key templates and typed
adapter bypasses.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node` — passed with 48 pre-existing
  warnings and zero errors.
- `npm run ci:redis:architecture` — passed.
- Focused Jest Redis/session contract tests — 15 passed.
- Focused Redis contract/auth/MFA/account/feedback tests — 6 passed.
- Focused OAuth/SSO/pub-sub tests — 4 passed.
- `npm run build --workspace mercurion_web_node` — passed.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are prohibited in
autonomous sessions. Exact feature-SHA GitHub Actions validation is owned by
the coordinator after push.
### Browser validation performed
_Not applicable._
### Commits
Pending task commit; feature SHA and push recorded by the worker result.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
