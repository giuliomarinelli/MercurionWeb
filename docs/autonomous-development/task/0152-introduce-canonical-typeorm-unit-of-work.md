# 0152 - Introduce a canonical TypeORM unit of work

- [ ] DONE
- [ ] BLOCKED

## Objective

Standardize MercurionWebNode transactional persistence behind one Unit of Work contract so every operation in a transaction uses the same `EntityManager` and transaction lifecycle cannot be partially awaited, nested accidentally or bypassed by injected repositories.

Source: `DATA-003` in Series `0001`.

## Context

Current services mix `dataSource.manager.transaction(...)`, repository-manager transactions and manual `QueryRunner` lifecycle. `UserService` alone uses both callback transactions and `createQueryRunner()`, while Notebook, Auth, History and MoleculeCollection use other forms. This makes it easy for a helper called from inside a transaction to read/write through its injected repository and therefore escape the active transaction.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/user/services/user.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/`
- `MercurionWebNode/src/app_modules/lab-notebook/services/`
- `MercurionWebNode/src/app_modules/molecule-collection/services/`
- `MercurionWebNode/src/app_modules/help/services/`
- `MercurionWebNode/src/app_modules/history/services/`
- persistence/core infrastructure introduced by this task
- transaction-related specs

## In scope

- Define a narrow Unit of Work abstraction backed by TypeORM.
- Provide an explicit transaction context containing the active `EntityManager`/manager-bound repositories.
- Make nested use-case calls reuse the caller's transaction context instead of silently opening an unrelated transaction.
- Encapsulate any unavoidable raw `QueryRunner` usage inside infrastructure; application services must not own connect/start/commit/rollback/release choreography.
- Migrate representative/core transaction entrypoints to establish the canonical pattern.
- Add a static architecture rule preventing new direct transaction mechanisms outside approved persistence infrastructure.
- Add rollback/nesting tests with a real database.

## Out of scope

- Do not convert every service in the repository merely to maximize diff size; migrate all transactional code needed to make the canonical rule enforceable, with specialized domain migrations completed by their later DATA tasks.
- Do not perform external HTTP/mail/Dropbox effects inside a database transaction; use outbox/compensation patterns in their owning tasks.
- Do not introduce distributed transactions.
- Do not redesign repository ownership established by `BE-006`.

## Decisions already made

- One logical command has one root DB transaction.
- A transactional callee receives/reuses the existing context; it does not create a hidden independent transaction.
- All reads/writes that are part of the atomic command use the active manager.
- Commit/rollback/release ownership belongs to infrastructure and is always awaited.
- Exceptions propagate after rollback; infrastructure errors are not converted into false success/not-found results.

## Requirements

1. Inventory all `DataSource.transaction`, `Repository.manager.transaction`, `createQueryRunner`, manual transaction and manager-mixing sites in `MercurionWebNode`.
2. Implement a typed `UnitOfWork.run(...)`-style boundary exposing the active transaction context without leaking a global mutable manager.
3. Define explicit behaviour for a use case invoked with an existing transaction context; default to reuse rather than implicit nesting.
4. Provide manager-bound repository access/helpers so transactional code cannot accidentally call an injected root repository.
5. Move manual `QueryRunner` lifecycle behind the adapter or eliminate it where callback transactions are sufficient.
6. Add tests proving commit on success, rollback on throw, reuse across nested use cases and no outside-manager writes.
7. Add an architecture/static gate to `ci:check` that rejects new raw transaction entrypoints outside the approved layer.

## Acceptance criteria

- [ ] MercurionWebNode has one documented Unit of Work contract for DB transactions.
- [ ] A transaction's reads and writes use only its active manager/context.
- [ ] Application services do not manually own QueryRunner lifecycle.
- [ ] Nested transactional use cases reuse the same root transaction by explicit context propagation.
- [ ] Rollback and commit behaviour are deterministic and integration-tested.
- [ ] CI prevents reintroduction of ad-hoc transaction patterns.

## Validation

Run Unit of Work integration tests against a disposable database, affected service tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a current command intentionally requires nested/savepoint semantics that cannot be represented safely without a domain decision, or if a transaction includes an external side effect whose required consistency model is unresolved.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md` and `0119-keep-domain-repositories-private.md` should be `DONE`.
- `0150-establish-versioned-typeorm-migrations.md` should be `DONE` for real-database integration fixtures.

## Implementation notes

Do not implement transaction context through process-global state or AsyncLocalStorage unless there is a demonstrated need and its lifecycle is rigorously bounded. Passing an explicit context is easier to reason about and test.

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
