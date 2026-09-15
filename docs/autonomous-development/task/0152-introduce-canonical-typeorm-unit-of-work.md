# 0152 - Introduce a canonical TypeORM unit of work

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Standardize MercurionWebNode transactional persistence behind one Unit of Work contract so every operation in a transaction uses the same `EntityManager` and transaction lifecycle cannot be partially awaited, nested accidentally or bypassed by injected repositories.

Source: `DATA-003` in Series `0001`.

## Context

Current services mix `dataSource.manager.transaction(...)`, repository-manager transactions and manual `QueryRunner` lifecycle. `UserService` alone uses both callback transactions and `createQueryRunner()`, while Auth, History and MoleculeCollection use other forms. This makes it easy for a helper called from inside a transaction to read/write through its injected repository and therefore escape the active transaction.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/user/services/user.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/`
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

- `0115-break-nest-domain-module-dependency-cycle.md` and `0120-keep-typeorm-repositories-private-to-owning-domains.md` should be `DONE`.
- `0150-establish-versioned-typeorm-migrations.md` should be `DONE` for real-database integration fixtures.

## Implementation notes

Do not implement transaction context through process-global state or AsyncLocalStorage unless there is a demonstrated need and its lifecycle is rigorously bounded. Passing an explicit context is easier to reason about and test.

## Execution notes

### Feature branch
Recovered `feature/DATA-003` from preserved SHA
`7629ec35abae6e3c398b13b55e1a41590559d002` by merging the current green
`develop` SHA `3c41ea9f99d7d27dce3a048f83722769815afe25` with
`--no-ff --no-gpg-sign` (recovery merge `a66244af8b43c4e35fc40f63ed3b3cbf6f4ae460`).
### Preflight
- Confirmed clean synchronized `develop`, local/remote preserved recovery refs,
  `commit.gpgSign=false`, no task-owned runtime/test process, and successful
  isolated npm install/call/cleanup capability probe.
- Confirmed all hard dependencies `0115`, `0120`, and `0150` are `DONE` and
  `npm run autonomous:plan` reported no errors, cycles, or stale skips before
  recovery.
- Certified exact base SHA with fresh GitHub Actions full CI run `34997244092`:
  Windows and Ubuntu prerequisites, all container/build/test/schema jobs, and
  `Required gate` succeeded.
- Focused unchanged checks passed:
  - `npm run ci:nest:architecture`;
  - `npm run typecheck --workspace mercurion_web_node`;
  - `npm test --workspace mercurion_web_node -- --runInBand
    --runTestsByPath src/persistence/transaction-context.spec.ts
    src/app_modules/auth/application/account-flow-kernel.spec.ts
    src/app_modules/molecule-collection/services/initial-workspace.service.spec.ts`
    (3 suites, 4 tests).
- No browser/runtime validation was required. `npm ci` and
  `npm run ci:check` were not run.
### Summary
Implemented and documented the canonical TypeORM `UnitOfWork` with an opaque,
explicitly propagated `TransactionContext`, manager-bound repository access,
root-context reuse for nested use cases, deterministic context invalidation,
and awaited post-commit effects that never run after rollback. External auth,
SSO and molecule-lookup effects were moved outside database callbacks or
registered after commit.

Migrated every existing application-service raw transaction and removed manual
`QueryRunner` ownership. Added `ci:transactions` plus its negative test to
reject new direct TypeORM transaction mechanisms outside persistence
infrastructure. Added a PostgreSQL integration probe to the existing migration
schema job for commit, rollback, nesting, manager reuse, and post-commit
semantics.
### Task-specific validation performed
- `npm run ci:transactions` passed, including the negative policy test.
- `npm run ci:nest:architecture` passed.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run lint --workspace mercurion_web_node` passed with zero warnings.
- Complete Nest unit suite passed: 157 suites, 509 tests.
- Complete Nest E2E suite passed: 1 suite, 3 tests.
- `npm run build --workspace mercurion_web_node` passed.
- `npm run ci:database-schema` passed against disposable PostgreSQL after all
  migrations: UnitOfWork commit/rollback/nesting/post-commit integration checks
  passed and the container was removed.
- `git diff --check` passed.
### Full pre-merge CI-parity validation
Exact feature SHA `91a046176d89ca45c728785d0e21e857e4ab04cb` passed the
complete GitHub Actions workflow in run `34999674430`, including the stable
Required gate. Local `npm ci` and `npm run ci:check` were not run;
clean-install aggregate evidence belongs to GitHub Actions.
### Browser validation performed
_Not applicable._
### Commits
`f156a796d7980c22fedcdde681d27d47c42a09dc` — canonical UnitOfWork,
application migrations, architecture gate and PostgreSQL integration probe.

`91a046176d89ca45c728785d0e21e857e4ab04cb` — recovery evidence and reset of
the five dependency skips made stale by DATA-003 becoming `DONE`.
### Merge / CI
Merged into `develop` with `--no-ff --no-gpg-sign` as
`98f500ee1db704873f5f475fa0f6245dca4e9fdb`. Exact merge-SHA full CI passed in
run `35000347615`, including Windows, Ubuntu, container builds, Angular and
Nest tests/builds, PostgreSQL migration/UnitOfWork probes, and Required gate.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
