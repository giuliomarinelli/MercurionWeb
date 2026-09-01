# 0179 - Make session Redis operations indexed and atomic

- [ ] DONE
- [ ] BLOCKED

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

- [ ] No normal auth/session request path performs keyspace `SCAN` to locate a session or token.
- [ ] Session create/activate/refresh/revoke/destroy keep all Redis indexes consistent atomically.
- [ ] Concurrent same-device/session operations preserve documented invariants.
- [ ] Expired sessions do not leave unbounded stale secondary indexes.
- [ ] Real-Redis integration tests cover races and partial-failure scenarios.

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