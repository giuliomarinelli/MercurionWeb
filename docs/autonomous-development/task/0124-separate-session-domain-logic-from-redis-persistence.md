# 0124 - Separate session domain logic from Redis persistence

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Split `SessionService` into a session-domain/application service and a Redis session repository/codec so key schema, serialization, scans and atomic storage mutations no longer live inside authentication use cases.

Source: `BE-010` in Series `0001`.

## Context

`SessionService` currently owns session signing/verification, Redis keys, user-session indexes, fingerprint/location data, serialization/DTO mapping, TTLs and request-level session operations. It directly calls `RedisService`, including `scanIterate()` paths to rediscover session ownership. The Series records 604 lines and 41 methods. Later DATA tasks replace scans with direct indexes, standardize key/TTL schema, atomically mutate sessions and version serialized records; this task creates the repository boundary those tasks will improve without prematurely changing persistence semantics.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/session.service.ts`
- session interfaces/DTOs/options under `auth/Models/`
- `MercurionWebNode/src/app_modules/redis/services/redis.service.ts`
- auth handlers/guards/socket code consuming sessions
- session/auth/Redis specs

## In scope

- Define a session-domain/application API for create/read/refresh/revoke/trust decisions required by callers.
- Extract Redis key construction, serialization/deserialization, indexes/scans and TTL persistence into a session repository/adapter.
- Keep session-id signing/verification in a focused identity/value-object service if it is not repository responsibility.
- Ensure application callers never manipulate Redis keys or serialized session records directly.
- Preserve current lookup/index/TTL behaviour pending DATA-series optimizations.
- Add repository contract tests and domain-service tests with an in-memory/fake repository.
- Retire the broad `SessionService` implementation once callers use the split APIs.

## Out of scope

- Do not replace `SCAN` with the final direct-index design yet; `DATA-030` owns that migration.
- Do not define Redis schema version migration yet; `DATA-037` owns record versioning.
- Do not redesign TTL units/key taxonomy globally; `BE-023` owns the shared Redis key builder.
- Do not change session lifetime/security policy.

## Decisions already made

- Session business policy and Redis persistence are separate layers.
- Redis session records are decoded/encoded only by the repository/codec boundary.
- Authentication/guards consume session-domain capabilities, never raw Redis operations.
- Persistence implementation can later change without changing the public session use-case API.

## Requirements

1. Inventory all SessionService methods and classify domain command/query, signing/value-object, persistence, index/key or mapping responsibility.
2. Define a minimal session repository interface covering current persistence semantics.
3. Move key/pattern/scan/serialization/TTL code behind the repository adapter.
4. Keep create/refresh/revoke/trust/session policy in focused application/domain services.
5. Update Auth, guard, socket/pub-sub and other callers to use public session APIs only.
6. Add contract tests comparing the Redis adapter to an in-memory fake for observable semantics.
7. Preserve current TTL/index behaviour until dedicated DATA tasks deliberately improve it.

## Acceptance criteria

- [ ] Session application/domain code does not import `RedisService` or build Redis keys.
- [ ] Redis session persistence is isolated behind a typed repository/codec.
- [ ] Callers cannot read/write serialized session records directly.
- [ ] Existing session create/read/refresh/revoke/trust behaviour remains compatible.
- [ ] Repository/domain tests cover success, missing, invalid signature/record and failure paths.

## Validation

Run session/Redis repository/auth/guard/socket focused tests, relevant E2E flows, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if extracting the boundary requires choosing new Redis atomicity/index semantics owned by later DATA tasks; preserve the old behaviour behind the new adapter instead of guessing.

## Dependencies

- `0118-give-every-core-nest-provider-a-single-owner.md` must be `DONE`.
- `0122-split-authentication-flows-into-typed-command-handlers.md` should be `DONE` so callers use the final session API.

## Execution notes

### Feature branch
`feature/BE-010`, created from and descended directly from green `develop`
SHA `93b765d36ddd8f82e3951d2fe6b86798bacc7dd7`.
### Preflight
- Confirmed the clean local branch was exactly `feature/BE-010` at the supplied
  base SHA and that the base is an ancestor of the task branch.
- Confirmed GitHub Actions CI run
  `https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34692071044`
  completed successfully for the exact base SHA.
- Confirmed no Angular, Nest, Tox21, Jest watcher, or other task-owned
  workspace-consuming process was active.
- Confirmed prerequisite tasks 0118 and 0122 are `DONE`.
- Focused unchanged preflight passed: 9 session/auth/guard/socket/module
  suites, 28 tests.
- Local `npm ci` and `npm run ci:check` were not run.
### Preflight remediation
_None._
### Summary
- Inventoried and classified the former `SessionService` surface:
  - domain/application commands and policy: `createSession`,
    `activateSession`, `validateSession`, `revokeManyJtis`,
    `revokeAllTokensBySessionId`, `destroySession`,
    `destroySessionByOwner`,
    `destroyAllSessionsAndRevokeAllTokensByUserId`,
    `destroySessionAndRevokeAllTokensByPlainSessionId`,
    `destroySessionAndRevokeAllTokensBySignedSessionId`,
    `addTrustedLocation`, and DTO-list/current-session mapping;
  - domain/application queries: `getActivatedSessionsForUser`,
    `isSessionLongTerm`, `getAllSessionsByUserId`,
    `getAllActiveSessionsByUserIdAsDTOs`, `existsSession`, `getSession`,
    `isTokenRevoked`, `getJtiListBySessionId`,
    `getFingerprintWhiteList`, `isFingerprintInWhiteList`,
    `getTrustedLocations`, and `isKnownDeviceId`;
  - persistence operations: `updateLastAccessed`, `revokeSession`,
    `revokeToken`, fingerprint/device/location writes, issued-token TTL
    lookup and revocation storage;
  - signing/value-object responsibility: signed session-ID creation and
    verification;
  - Redis key/index/scan/mapping responsibility:
    session/user-index/trust/token key builders, owner rediscovery scans,
    hash serialization/deserialization, TTL writes, index cleanup, and
    Redis deletion.
- Added a typed `SessionRepository` port, an in-memory fake, and the
  `RedisSessionRepository` adapter. All session hashes, user indexes,
  scans, issued/revoked JTI keys, trust keys, serialized values, TTLs, and
  unlink/delete behavior now remain inside the adapter.
- Added `SessionRedisCodec` as the only session-record encoder/decoder and
  `SessionIdentityService` as the focused HMAC signing/verification owner.
- Reduced `SessionService` to session use-case orchestration, validation,
  trust decisions, DTO projection, and repository delegation without a
  `RedisService` import or Redis key construction.
- Routed issued-token registration from `JwtToolsService` and expired-session
  index cleanup from `PubSubService` through the public session API. Existing
  auth handlers, guards, sockets, account/MFA/SSO consumers continue to use
  the compatible public `SessionService` capabilities.
- Preserved the current `SCAN` owner/index fallback, key taxonomy, record
  fields, short/long TTL behavior, long-session expiry calculation,
  JTI-revocation TTL fallback, user-session indexes, trust TTLs, and
  non-transactional mutation ordering. No DATA-owned index, schema-version,
  or atomicity decision was introduced, so the stop condition did not apply.
### Task-specific validation performed
- Shared repository contract tests compare the Redis adapter with the
  in-memory fake for missing/create/read/activate/invalidate/delete,
  owner/index, token, fingerprint, trusted-location, known-device, and
  long-term semantics. Adapter-specific coverage verifies malformed-record
  rejection and current create/refresh/revocation TTL behavior.
- Domain tests cover valid/missing/mismatched sessions, same-device
  replacement, invalid signed IDs, trust-location policy, and repository
  failure propagation.
- Final focused repository/session/JWT/pub-sub/provider run passed:
  5 suites / 18 tests.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run lint --workspace mercurion_web_node` passed with 48 warnings and
  no errors.
- `npm run ci:nest:architecture` passed: 22 production modules, 8
  configuration files, acyclic module graphs, and unique governed-provider
  ownership.
- `npm run build --workspace mercurion_web_node` passed.
- Full Nest unit suite passed: 138 suites / 299 tests.
- Full Nest E2E suite passed: 1 suite / 1 test.
- `git diff --check` passed. Static key inventory confirmed that session
  Redis schema/index/JTI/trust keys are absent from session-domain and
  application callers; remaining `ws_session:*` strings are Socket.IO room
  names rather than Redis session records.
### Full pre-merge CI-parity validation
Complete clean-install and aggregate CI parity are reserved for GitHub Actions
on the exact pushed feature SHA. No forbidden local `npm ci` or
`npm run ci:check` command was executed.
### Browser validation performed
_Not applicable._
### Commits
- `935a61d7e15cafa231ccaa1e74421a32cea82cd0` — BE-010 Redis session
  repository/codec extraction, domain service reduction, caller migration,
  and focused tests, committed with `--no-gpg-sign` and the Copilot co-author
  trailer.
- Task-status and execution-note finalization: current documentation commit.
### Merge / CI
Provisional `DONE` / `CI_PENDING`; exact feature-SHA CI and integration are
coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
