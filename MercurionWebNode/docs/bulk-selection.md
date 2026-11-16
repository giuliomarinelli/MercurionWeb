# Bulk selection contract

Molecule collection commands interpret `selectAll` as a closed snapshot, not
as an instruction to re-read an unbounded current population on every retry.

- The client captures `snapshotAt` when the user selects all and reuses that
  value for submission or retry.
- The server includes only owned rows whose `createdAt` is less than or equal
  to that boundary. Rows created later are never added by the same command.
- `itemIds`/`collectionIds` are exclusions when `selectAll` is true and explicit
  inclusions otherwise.
- Candidates are ordered by `createdAt` and UUID, then normalized to a stable
  UUID order before the write set is calculated.
- A synchronous command may contain at most 500 candidates. The server throws
  `BulkJoinLimitExceededError` with code `BULK_JOIN_LIMIT_EXCEEDED` before any
  join or touch write begins when the bound is exceeded.
- The candidate read, existing-join read, inserts and touch updates share one
  transaction. Retrying the same snapshot is logically idempotent: the closed
  candidate population cannot grow, and the database uniqueness constraint is
  the final duplicate-write guard.

Deleting a source row after the snapshot may reduce the surviving write set;
it can never add a replacement or a row created after the boundary.
