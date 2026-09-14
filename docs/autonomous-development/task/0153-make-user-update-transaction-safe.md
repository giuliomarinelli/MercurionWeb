# 0153 - Make UserService updates transaction-safe

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Refactor `UserService.updateUser` so update, read-back and failure handling execute entirely through the canonical Unit of Work transaction context, with awaited rollback/lifecycle and no silent persistence failure.

Source: `DATA-004` in Series `0001`.

## Context

`UserService.updateUser()` currently creates a `QueryRunner`, updates through `queryRunner.manager`, then calls `this.getUserById(id)` through the injected repository outside that transaction. Its catch block invokes `rollbackTransaction()` without `await`, returns `null`, and the `finally` block invokes `release()` without `await`. A persistence/connection error is therefore indistinguishable from a legitimate missing result and transaction cleanup is not guaranteed before the method resolves.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/user/services/user.service.ts`
- User repository/port created by earlier BE tasks
- Unit of Work infrastructure from `0152`
- callers in Account/MFA/Auth services
- User service unit/integration specs

## In scope

- Replace the manual QueryRunner implementation of `updateUser` with the canonical Unit of Work.
- Perform update and read-back through the same active `EntityManager`/manager-bound repository.
- Distinguish `user not found/no row updated` from an infrastructure/transaction failure.
- Ensure all transaction completion/rollback work is awaited by the Unit of Work infrastructure.
- Update callers/tests that relied on persistence errors being converted to `null`.
- Add rollback tests proving no update is visible if the read-back or a later transactional step fails.

## Out of scope

- Do not redesign unrelated UserService methods unless required to use the same transaction context safely.
- Do not change account/MFA product semantics or public responses beyond correctly distinguishing a real data error from not-found.
- Do not add a second transaction helper specific to UserService.

## Decisions already made

- Transactional read-back uses the same manager that performed the write.
- Infrastructure failures are propagated as errors after rollback; they are not represented as a missing user.
- A legitimate absent user is handled explicitly and deterministically.
- No manual `commitTransaction`/`rollbackTransaction`/`release` remains in this use case.

## Requirements

1. Capture current caller expectations for `updateUser` returning `User | nullish` and classify each use as update-existing, optional update or error path.
2. Implement the update via `UnitOfWork`/transaction context from `0152`.
3. Use an affected-row check or manager-scoped lookup to identify an absent user without conflating SQL/connection errors.
4. Read the updated row through the same manager before transaction completion when the method promises a returned entity.
5. Remove the current un-awaited rollback/release code path.
6. Add tests for success, no matching user, update failure, read-back failure and cleanup/rollback.
7. Verify callers do not continue a security-sensitive flow after an infrastructure failure represented as `null`.

## Acceptance criteria

- [ ] `updateUser` contains no manual QueryRunner lifecycle.
- [ ] Update and read-back are part of one transaction/context.
- [ ] Persistence failures rollback and propagate; they never masquerade as not-found.
- [ ] A missing user has an explicit tested outcome.
- [ ] Transaction resources are deterministically released by the canonical infrastructure.
- [ ] Existing successful account/MFA update flows remain compatible.

## Validation

Run focused UserService transaction integration tests, affected Account/MFA/Auth tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a current caller relies intentionally on swallowing database errors and changing that behaviour requires an unresolved product/security decision.

## Dependencies

- `0152-introduce-canonical-typeorm-unit-of-work.md` must be `DONE` first.

## Execution notes

### Feature branch
_Not started._
### Preflight
_Not started._
### Preflight remediation
_None._
### Summary
Skipped because the resolved dependency closure contains terminal prerequisite 0120 (BE-006), which is BLOCKED by its deferred DATA unit-of-work decision. Resolved hard dependencies for this recipe: 0152. This task was never attempted and receives no feature branch.
### Task-specific validation performed
_Not started._
### Full pre-merge CI-parity validation
_Not started._
### Browser validation performed
_Not applicable._
### Commits
Aggregate dependency-skip metadata commit on develop.
### Merge / CI
Recorded in one aggregate dependency-skip metadata commit; exact-SHA CI required.
### Rollback
_Not applicable._
### Blocker / human decision required
Terminal dependency root: 0120 (BE-006), BLOCKED pending the DATA-series unit-of-work contract. No feature branch or worker was created for this task.
