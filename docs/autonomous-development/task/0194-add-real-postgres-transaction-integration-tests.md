# 0194 - Add real PostgreSQL transaction integration tests

- [ ] DONE
- [ ] BLOCKED

## Objective

Add integration tests against a disposable real PostgreSQL instance that prove transaction rollback, database constraints, isolation and concurrency invariants which mocked QueryRunner/EntityManager tests cannot establish.

Source: `QA-008` in Series `0001`.

## Context

The audit found that transaction-heavy Nest code is mostly tested through mocked QueryRunner behavior. The DATA tasks introduce versioned migrations, database constraints, a canonical Unit of Work, Notebook sibling-order locking, transactional outbox and bulk ownership/write invariants. Those semantics depend on the actual PostgreSQL driver/database and need a reusable integration-test foundation that starts from migrations rather than TypeORM `synchronize`.

## Relevant files and modules

- TypeORM DataSource/migrations from `0150`
- database constraints/indexes from `0151`
- canonical Unit of Work from `0152`
- User/Notebook/Help/outbox/molecule bulk persistence
- PostgreSQL test-service configuration
- Jest integration-test setup/teardown
- canonical CI pipeline

## In scope

- Provision an isolated disposable PostgreSQL service/database for integration tests locally and in CI.
- Build schema only by running repository migrations.
- Add reusable transaction/database fixture helpers with deterministic cleanup.
- Prove rollback behavior after mid-command failures.
- Prove representative unique/check/foreign-key constraints by bypassing application pre-checks.
- Prove Notebook sibling-order and another representative concurrency invariant under parallel transactions.
- Prove isolation/visibility assumptions used by Unit of Work/outbox/bulk commands.
- Keep these tests separate from fast pure unit tests while including them in CI parity.

## Out of scope

- Do not point tests at shared developer, staging or production databases.
- Do not use `synchronize: true` to create the integration schema.
- Do not treat mocked QueryRunner tests as substitutes for the real-database suite.
- Do not serialize every integration test globally when independent schemas/databases can provide safe isolation.

## Decisions already made

- Migrations are the schema authority for integration tests.
- Concurrency and constraint behavior is proven on the supported real SQL dialect.
- Test data isolation and cleanup are deterministic and suite-owned.
- Database failures map through typed persistence/application errors where relevant.

## Requirements

1. Add a documented integration-test PostgreSQL configuration usable locally and by GitHub Actions without production secrets.
2. Create the database/schema from empty state by applying all migrations before tests.
3. Provide fixture factories and cleanup/reset strategy that does not mask transaction behavior under test.
4. Add rollback tests where writes occur before an injected failure and assert no partial durable state.
5. Add direct constraint tests for representative ownership/join/identity invariants introduced by `0151`.
6. Add parallel transaction tests for Notebook sibling ordering and at least one other race-sensitive domain command.
7. Verify Unit of Work consumers use the transaction-scoped manager/repository rather than accidentally reading/writing outside the transaction.
8. Register the integration suite in the canonical CI aggregate with clear diagnostics/artifacts on failure.

## Acceptance criteria

- [ ] Integration tests run against disposable real PostgreSQL created from migrations.
- [ ] Rollback and database constraints are proven without mocks.
- [ ] Representative concurrent writes preserve documented invariants.
- [ ] Tests never contact a shared/staging/production database.
- [ ] The suite is part of canonical CI parity and cleans resources deterministically.

## Validation

Start from an empty test database, run migrations and the full PostgreSQL integration suite including repeated concurrency tests, then Nest unit/E2E tests, lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the actual supported SQL dialect/deployed PostgreSQL capabilities remain unresolved after `0150`, or if a concurrency invariant requires a product/locking decision not established by its DATA task.

## Dependencies

- `0150` versioned migrations and `0151` database constraints must be `DONE`.
- `0152` Unit of Work and relevant DATA transaction tasks should be `DONE`.
- `0188` must provide reliable Jest lifecycle/teardown.

## Implementation notes

A transaction mock can prove that code calls `rollbackTransaction`; it cannot prove isolation, constraint timing, locking or that all repository access actually participates in the transaction. Keep both levels where useful, but use real PostgreSQL for database semantics.

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