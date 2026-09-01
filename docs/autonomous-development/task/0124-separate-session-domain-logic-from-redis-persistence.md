# 0124 - Separate session domain logic from Redis persistence

- [ ] DONE
- [ ] BLOCKED

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
