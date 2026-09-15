# 0179 - Make session Redis operations indexed and atomic

- [ ] DONE
- [x] BLOCKED
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
`feature/DATA-030` from base `c9e07a8113c96751a227bb0ffa9bbeff7154f008`.
### Preflight
Local branch was clean and exactly at the supplied/current green `develop` base.
`npm run autonomous:plan` classified task 0179 as READY with hard dependencies
0136 and 0124 DONE. The exact base SHA had successful Actions run 34975442119
(`Required gate`, Ubuntu and Windows jobs). No workspace-consuming process was
active before implementation. `npm ci` and `npm run ci:check` were not run.
### Preflight remediation
None.
### Summary
Implemented direct session primary/owner/device/token indexes and Redis Lua
atomic primitives for session creation/replacement, activation, refresh,
invalidation, destruction and token registration. Removed request-path session
and JTI keyspace scans; user and token lookups now use direct set/key indexes.
The feature remains blocked because the required post-implementation runtime
probe could not start Nest: canonical `npm run start:dev --workspace
mercurion_web_node` compiled successfully but exited during bootstrap with
`fastify-plugin: fastify-formidable - expected '4.x' fastify version, '5.12.1'
is installed`. This is a pre-existing baseline/runtime dependency mismatch,
not caused by the session changes, and prevented the recipe's explicitly
required browser login/session/logout evidence.
### Task-specific validation performed
Passed focused Redis repository, Redis key-contract and Redis service tests:
23 tests in 3 suites. Passed `npm run typecheck --workspace
mercurion_web_node`, `npm run lint --workspace mercurion_web_node`, and
`npm run build --workspace mercurion_web_node`. `git diff --check` passed.
Canonical runtime starts were issued in Tox21, Nest, Angular order with live
execution handles. Tox21 and Angular remained alive; Nest reached zero compile
errors, connected to Redis, then terminated at bootstrap with the diagnostic
above. All three task-owned sessions were stopped and process inventory showed
no Tox21/Nest/Angular process remaining.
### Full pre-merge CI-parity validation
Not run locally; forbidden by policy. Exact feature-SHA Actions evidence was
not available because the branch is blocked before publication.
### Browser validation performed
Not performed. Browser/runtime acceptance could not begin because the
canonical Nest process failed during startup before nginx readiness/login.
### Commits
Pending blocker commit on `feature/DATA-030`.
### Merge / CI
Not applicable before baseline/runtime repair.
### Rollback
_Not applicable._
### Blocker / human decision required
Repair the repository-controlled Fastify/formidable dependency compatibility
(`fastify-formidable` currently expects Fastify 4 while the green baseline
installs Fastify 5), then rerun the canonical runtime/browser acceptance probe
and exact feature-SHA CI. The preserved feature branch contains the coherent
implementation and blocker diagnostic.
