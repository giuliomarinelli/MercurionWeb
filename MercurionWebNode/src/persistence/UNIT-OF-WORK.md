# TypeORM Unit of Work

`transaction-context.ts` is the only application-facing boundary for TypeORM
transactions.

- Start one logical command with `UnitOfWork.run(...)` or
  `runInTransaction(...)`.
- Pass the received `TransactionContext` explicitly to transactional callees.
  Supplying that context to a nested `run` reuses the same `EntityManager` and
  never opens an implicit nested transaction.
- Read and write through `transactionManager(context)`,
  `transactionRepository(context, Entity)`, or the manager passed to the
  callback. Never use an injected root repository from inside the callback.
- Register Redis, session, mail, HTTP, object-storage, or search-index effects
  with `afterTransactionCommit(...)`, or execute them outside the transaction.
  Post-commit failures are reported to the caller but cannot roll back the
  committed database work.
- Do not use `DataSource.transaction`, `Repository.manager.transaction`, or
  `QueryRunner` lifecycle methods in application code. `npm run
  ci:transactions` enforces this boundary.

The context is opaque, scoped to one root transaction, and invalidated when
that callback completes. It is never stored in process-global mutable state or
propagated through `AsyncLocalStorage`.
