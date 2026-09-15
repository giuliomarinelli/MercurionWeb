# 0156 - Centralize atomic attempts and rate-limit policy

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Replace duplicated Redis attempt/cooldown/lock logic in Account, MFA, Authentication and Feedback with one typed atomic policy engine whose limits, windows, reset semantics and error outcomes cannot drift between comments and runtime behaviour.

Source: `DATA-007` in Series `0001`.

## Context

Account and MFA currently define many local constants such as fail windows, maximum attempts, send windows and lock durations, then manually combine `exists`, `incr`, first-increment TTL setup and separate lock keys. Feedback implements a similar pattern. These multi-command sequences are repeated and can race when concurrent attempts observe/update the same key. Earlier backend tasks canonicalize Redis key/TTL ownership; this task provides the domain policy and atomic execution model.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/account.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/mfa.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/authentication.service.ts`
- `MercurionWebNode/src/app_modules/feedback/services/feedback.service.ts`
- Redis key/TTL infrastructure from backend tasks
- typed application errors from `0127`
- policy/Redis integration tests

## In scope

- Define typed policy descriptors for attempt limits, send limits, rolling/fixed windows, lock duration, reset-on-success and stable error code.
- Move policy values to one authoritative registry/config rather than per-service constants/comments.
- Execute check/increment/TTL/lock transitions atomically in Redis using a transaction/script or equivalent single atomic primitive.
- Expose intention-level operations such as `assertAllowed`, `recordFailure`, `recordSend`, `recordSuccess/reset` rather than raw Redis commands.
- Migrate Account, MFA, Authentication and Feedback governed flows.
- Use the canonical Redis key registry/namespacing from the BE tasks.
- Add deterministic time/concurrency tests.

## Out of scope

- Do not merge semantically different security policies merely because they share implementation mechanics.
- Do not lower limits or change lock durations without an approved security/product requirement; preserve current effective values unless they are internally contradictory.
- Do not expose raw email/phone/recovery secrets in Redis keys or logs.
- Do not use a process-local counter for distributed enforcement.

## Decisions already made

- Policy definition and atomic counter execution are separate concerns.
- A single policy descriptor is the source of truth for limits, TTLs and lock semantics; comments are not configuration.
- Concurrent failures cannot lose increments or create keys without the intended expiry.
- Domain services receive typed outcomes/errors and do not manipulate Redis counters directly.

## Requirements

1. Inventory every governed Account/MFA/Authentication/Feedback counter/lock/send key and its current max/window/lock/reset semantics.
2. Reconcile duplicated constants/comments against actual runtime values; preserve the runtime contract unless a clear bug is proven and covered by tests.
3. Implement a typed policy registry keyed by stable policy identifiers and a Redis-backed atomic executor.
4. Make first increment + TTL and threshold-to-lock transition atomic; ensure lock expiry is explicit and deterministic.
5. Define success/reset behaviour per policy rather than applying a universal reset blindly.
6. Prevent sensitive raw identifiers from becoming observable Redis key components; use canonical hashing/key builders where required.
7. Migrate callers and remove local fail/send/lock constants and direct `getClient().incr`-style policy manipulation.
8. Add parallel-attempt tests proving exact threshold behaviour under concurrency and expiry/reset tests using controlled time.

## Acceptance criteria

- [ ] Account, MFA, Authentication and Feedback share one typed attempts/rate-limit engine.
- [ ] Governed services contain no duplicated counter/window/lock algorithms.
- [ ] Counter creation, TTL and lock transitions are atomic under concurrent requests.
- [ ] Current approved limits and security outcomes are preserved and table-tested.
- [ ] Redis keys use canonical namespacing and do not leak protected identifiers.
- [ ] CI includes deterministic policy/concurrency tests.

## Validation

Run policy unit tests, Redis-backed concurrent integration tests, affected auth/MFA/feedback suites, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if two duplicate implementations encode materially different security limits and current requirements do not establish which policy is authoritative; do not silently choose the more permissive one.

## Dependencies

- Typed application errors (`0127`) and the canonical Redis key/TTL infrastructure from the BE section must be `DONE`.
- `0155-make-registration-activation-sso-idempotent.md` should be `DONE` so security retry semantics are stable.

## Implementation notes

Prefer a small domain-specific rate/attempt API over a generic Redis wrapper with dozens of options. The policy engine should make invalid combinations difficult to express.

## Execution notes

### Feature branch
`feature/DATA-007`
### Preflight
Clean `feature/DATA-007` at base `48cc6412a0b8641d175dfd894c24a1887691bb0d`; local
branch matched the supplied SHA and no task-owned workspace process was active.
GitHub Actions run `35036213358` for the exact base SHA was successful, including
Ubuntu/Windows prerequisite and quality jobs plus `Required gate`.
### Preflight remediation
_None._
### Summary
Added the typed `AtomicAttemptPolicyService` and authoritative policy registry.
Redis Lua execution now atomically checks locks, increments counters, assigns
first-increment TTLs, transitions to explicit lock TTLs, and removes threshold
counters. Account, credential authentication, MFA, and feedback flows now use
the shared intention-level engine and canonical Redis keys. Approved effective
limits and error identities were preserved; no raw protected identifiers were
introduced.
### Task-specific validation performed
`npm run typecheck --workspace mercurion_web_node` passed.
Focused Jest suites passed (4 suites, 6 tests), including deterministic registry,
atomic invocation, threshold-transition, account-kernel, MFA, and feedback
coverage. `npm run lint --workspace mercurion_web_node`, `npm run build
--workspace mercurion_web_node`, `npm run ci:redis:architecture`, and
`git diff --check` passed. Governed service inspection found no remaining direct
counter `incr`/TTL algorithms or duplicated policy constants.
The first feature run (`35037165844`, SHA `fc125a77bb8fc77ddbe78a51c50027ea8cff0568`)
exposed stale credential-handler test doubles after the constructor migration.
Updated that task-owned test setup to mock the typed engine; the focused
credential suite (6 tests) and typecheck then passed.
### Full pre-merge CI-parity validation
Not run locally; forbidden by protocol. Exact pushed feature-SHA GitHub Actions
validation remains coordinator-owned.
### Browser validation performed
_Not started._
### Commits
Commits: `fc125a77bb8fc77ddbe78a51c50027ea8cff0568` (engine and migration);
pending repair commit for the credential handler test double.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
