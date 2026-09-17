# 0179 - Make session Redis operations indexed and atomic

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Redesign Redis session persistence so session lookup uses direct indexes and create/activate/refresh/revoke/destroy update session records, user indexes and token indexes atomically without `SCAN` in request paths.

Source: `DATA-030` in Series `0001`.

## Context

`SessionService` currently stores sessions as hashes named `session:<sessionId>:<userId>`, keeps `user_sessions:<userId>` sets, and resolves unknown user IDs by scanning `session:*` or even every `user_sessions:*` set. Session creation performs many separate `HSET` operations followed by TTL and `SADD`; activation and refresh are similarly multi-step. Partial failure can therefore leave record/index/TTL state inconsistent, and lookup cost can grow with the keyspace.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/session.service.ts`
- Redis service/key registry from BE-023/BE-024
- session interfaces/DTOs
- JWT issued/revoked token key handling
- auth guards/session activation/logout callers
- Redis integration test infrastructure

## In scope

- Define direct mappings for session ID→owner/session record and user→session IDs.
- Remove `SCAN`/pattern lookup from normal session validation/revocation/token request paths.
- Make create/activate/update-last-accessed/revoke/destroy and associated index/TTL changes atomic via Lua, Redis transactions or an equivalent tested primitive.
- Keep session and user-index TTL/cleanup semantics consistent.
- Make one-session-per-device replacement atomic enough that concurrent logins cannot leave multiple unintended active records.
- Batch token issuance/revocation index updates where necessary.
- Add race/failure tests using a real Redis-compatible instance.

## Out of scope

- Do not finalize serialized session schema/version migration; `0186` owns codecs/versioning.
- Do not change browser/client auth-state semantics established by FE/SYS tasks.
- Do not use Redis `KEYS` as a replacement for `SCAN`.

## Decisions already made

- Request-path session lookup is O(1)/bounded through direct keys/indexes.
- A session mutation that conceptually changes multiple Redis keys is atomic or explicitly recoverable.
- Redis key names/TTLs come from the canonical key contract, not ad-hoc literals.

## Requirements

1. Inventory session, `user_sessions`, issued/revoked JTI and device-related key relationships.
2. Define a canonical session primary key independent of needing the user ID to discover it, plus owner/user/device indexes as needed.
3. Implement atomic create including record, TTL and all required indexes.
4. Implement atomic activation/refresh/revocation/destruction so no index points to a missing record and no live record becomes unreachable.
5. Replace `findUserIdInUserSets`, wildcard session lookup and JTI scans in request paths with direct indexes.
6. Define cleanup behavior for expiry so secondary indexes do not accumulate stale IDs; lazy cleanup is acceptable only if bounded and tested.
7. Add concurrent login/logout/refresh/revoke tests and fault injection around atomic scripts/transactions.
8. Add metrics for stale-index detection/repair if any eventual cleanup remains.

## Acceptance criteria

- [x] No normal auth/session request path performs keyspace `SCAN` to locate a session or token.
- [x] Session create/activate/refresh/revoke/destroy keep all Redis indexes consistent atomically.
- [x] Concurrent same-device/session operations preserve documented invariants.
- [x] Expired sessions do not leave unbounded stale secondary indexes.
- [x] Real-Redis integration tests cover races and partial-failure scenarios.

## Validation

Run SessionService/guard/JWT integration tests against Redis, concurrency and expiry tests, verify command traces contain no request-path `SCAN`, then run Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate login, session refresh, logout and session-management UI through `http://localhost:8888`, including a second browser/session where feasible.

## Stop conditions

Mark `BLOCKED` if the deployed Redis-compatible service lacks the atomic primitive selected by the implementation and an alternative architecture requires an infrastructure decision.

## Dependencies

- BE-023/BE-024 Redis key/TTL contracts and `0136` Redis capability/readiness work must be `DONE`.
- Session domain decomposition from `0124`/BE-010 should be `DONE`.

## Implementation notes

Favor a direct `session:<sessionId>` primary record plus explicit owner/device indexes over embedding owner in the only key and then scanning to discover it. Exact key names must follow the canonical Redis registry established earlier.

## Execution notes

### Feature branch
`feature/DATA-030` was created from `c9e07a8113c96751a227bb0ffa9bbeff7154f008` and
preserved at `489ff4fa9dbf441546338daae3cdc456e1b6a38e`.
### Preflight
_Not started._
### Preflight remediation
_None._
### Summary
Implemented direct session primary, owner, device, and token indexes with Redis
Lua atomic primitives for session creation/replacement, activation, refresh,
invalidation, destruction, and token registration. Removed request-path
session/JTI keyspace scans. The task is blocked because the required
post-implementation runtime probe could not start Nest: canonical startup
compiled successfully and connected to Redis, then exited with
`fastify-plugin: fastify-formidable - expected '4.x' fastify version, '5.12.1'
is installed`. This baseline/runtime dependency mismatch prevented the required
browser login/session/logout evidence.
### Task-specific validation performed
Passed 23 Redis/session/key-contract tests across three suites, Nest
typecheck, lint, build, and `git diff --check`. Canonical runtime starts were
issued in Tox21, Nest, Angular order with live handles; all task-owned
sessions were stopped after Nest bootstrap failed.
### Full pre-merge CI-parity validation
Not run locally; forbidden by policy. Exact feature-SHA Actions run
34977410030 passed with the Required gate.
### Browser validation performed
Not performed because Nest failed during bootstrap before nginx readiness and
login/session validation.
### Commits
Feature implementation and blocker metadata: `489ff4fa9dbf441546338daae3cdc456e1b6a38e`.
### Merge / CI
Implementation was not merged. Feature CI run 34977410030 passed.
### Rollback
_Not applicable._
### Blocker / human decision required
Repair the repository-controlled Fastify/formidable compatibility mismatch,
then rerun the canonical runtime/browser acceptance probe and exact feature-SHA
CI. The preserved feature branch contains the coherent implementation and
blocker diagnostic.

### Interactive recovery (2026-09-17)
- Merged current green `develop` into the preserved feature branch. The later
  Fastify 5 compatibility adapter removed the original runtime blocker.
- Consolidated the duplicate Redis `eval` APIs on the typed keys/arguments
  contract and migrated the atomic-attempt policy and its regression test.
- Runtime testing against the real development Redis found and fixed an
  off-by-one Lua argument range that made an atomically created session
  unreadable, then verified login succeeds with the direct session record.
- Preserved the longest user-index TTL, made device-index deletion
  compare-and-delete safe, added bounded stale-index cleanup, and taught the
  keyspace listener to accept canonical `session:<id>` events.
- Canonical Tox21, Nest and Angular runtimes reached readiness through
  `http://localhost:8888`. The same-version browser suite passed 2/2 and now
  proves ordinary login, the protected settings “Sessioni attive” view,
  current-session visibility, logout and subsequent protected rejection.
- Final focused verification passed 30/30 tests across five Redis/session
  suites, plus Nest typecheck, lint and build.
- Final feature `1f1d58f4cca6b960b8e5e4f6dcfd5644f01f3ca8` passed exact
  CI run `35257870848`; merge `24bdc6fcfc1cb71f63ee01085d6d07e94568a986`
  passed exact CI run `35258693809`. Both runs completed the stable
  `Required gate` successfully.
