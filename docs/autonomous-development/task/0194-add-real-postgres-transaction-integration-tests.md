# 0194 - Add real PostgreSQL transaction integration tests

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Add integration tests against a disposable real PostgreSQL instance that prove transaction rollback, database constraints, isolation and concurrency invariants which mocked QueryRunner/EntityManager tests cannot establish.

Source: `QA-008` in Series `0001`.

## Context

The audit found that transaction-heavy Nest code is mostly tested through mocked QueryRunner behavior. The DATA tasks introduce versioned migrations, database constraints, a canonical Unit of Work, transactional outbox and bulk ownership/write invariants. Those semantics depend on the actual PostgreSQL driver/database and need a reusable integration-test foundation that starts from migrations rather than TypeORM `synchronize`.

## Relevant files and modules

- TypeORM DataSource/migrations from `0150`
- database constraints/indexes from `0151`
- canonical Unit of Work from `0152`
- User/Help/outbox/molecule bulk persistence
- PostgreSQL test-service configuration
- Jest integration-test setup/teardown
- canonical CI pipeline

## In scope

- Provision an isolated disposable PostgreSQL service/database for integration tests locally and in CI.
- Build schema only by running repository migrations.
- Add reusable transaction/database fixture helpers with deterministic cleanup.
- Prove rollback behavior after mid-command failures.
- Prove representative unique/check/foreign-key constraints by bypassing application pre-checks.
- Prove representative active-domain concurrency invariants under parallel transactions.
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
6. Add parallel transaction tests for at least one race-sensitive active-domain command.
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
`feature/QA-008` from base `4acaedc3c25171ee38da0fa797f7e6705e4af6cf`.
### Preflight
- Branch identity, cleanliness, exact base SHA and `commit.gpgSign=false`
  verified before edits.
- Exact base GitHub Actions CI run `35059501790` completed successfully.
- Unchanged-base Nest typecheck passed.
- The existing local schema probe was not runnable without database
  environment variables; this task's integration fixture therefore requires
  an explicit disposable-database opt-in and loopback database guard.
- No task-owned Angular, Nest, Tox21 or test-watcher process was active.
### Preflight remediation
None.
### Summary
Added an isolated PostgreSQL integration-test configuration and reusable
fixture. Each run drops the disposable schema, applies all TypeORM migrations,
and deterministically removes the database state during teardown. The suite
proves rollback, direct ownership/unique/check constraints, concurrent unique
writes, and transaction visibility through the active Unit of Work manager.
The canonical PostgreSQL CI job now runs the suite after migration/schema
validation and uploads its JSON diagnostics.
### Task-specific validation performed
- Started disposable `pgvector/pgvector:pg17` container
  `mercurion-postgres-integration` with database `mercurion_integration`.
- `npm run test:integration --workspace mercurion_web_node`: passed, 1 suite
  and 5 tests.
- Repeated the same integration command twice sequentially: both repetitions
  passed, including migration setup, rollback, ownership/unique/check
  constraints, concurrent writes and transaction visibility.
- `npm run ci:database-schema`: passed migrations, drift, Unit of Work and
  integrity checks against the disposable database.
- `npm run ci:transactions`: passed architecture and negative checks.
- `npm run typecheck --workspace mercurion_web_node`: passed.
- `npm run lint --workspace mercurion_web_node`: passed with zero warnings.
- `npm run build --workspace mercurion_web_node`: passed.
- `git diff --check`: passed.
- The disposable PostgreSQL container was stopped after validation.
### Full pre-merge CI-parity validation
Coordinator-owned exact feature-SHA GitHub Actions validation; not run locally.
Local `npm ci` and `npm run ci:check` were not run.
### Browser validation performed
Not applicable.
### Commits
`6b3e4c68` — disposable PostgreSQL fixture, migration-backed transaction
integration tests, CI registration, diagnostics upload and local runbook.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
