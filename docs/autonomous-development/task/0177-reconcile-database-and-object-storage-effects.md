# 0177 - Reconcile database and object-storage effects

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make document upload/delete/profile-image replacement converge after partial Dropbox/database failures through idempotent compensation or outbox work plus an observable reconciler that can detect and repair orphan objects and orphan metadata.

Source: `DATA-028` in Series `0001`.

## Context

Current upload writes to Dropbox first, then persists metadata; on DB failure it performs best-effort Dropbox delete. Avatar replacement deletes the old DB row in the transaction and attempts old-object cleanup after commit. Delete performs Dropbox deletion first and then DB deletion; if the second step fails, the code explicitly reports `File removed from Dropbox but not from DB`. These are unavoidable distributed effects, so best-effort inline cleanup alone cannot guarantee convergence after crash/network failure.

## Relevant files and modules

- document application service/object-store port from `0176`
- Dropbox adapter
- Document/User entities
- transactional outbox infrastructure from `0158`
- migrations from `0150`
- scheduler/worker lifecycle infrastructure
- logging/metrics infrastructure

## In scope

- Define durable state/intent for pending object creation/deletion/cleanup.
- Make upload/delete/avatar replacement idempotent across retries and process crashes.
- Use transactionally persisted compensation/outbox work where DB state participates.
- Implement a reconciler that detects DB→storage and storage→DB divergence using stable provider object identifiers.
- Define retry/backoff/dead-letter/terminal states and operational observability.
- Ensure repeated reconciliation is safe.
- Add failure-injection tests at every boundary between provider I/O and DB commit.

## Out of scope

- Do not promise a distributed ACID transaction across PostgreSQL and Dropbox.
- Do not make user requests wait for non-critical cleanup retries.
- Do not generalize every external effect yet; `0183` will unify the repository-wide event/outbox boundary.

## Decisions already made

- Cross-system consistency is achieved by durable intent + idempotent convergence, not pretending provider calls participate in the DB transaction.
- Provider object IDs/paths used for reconciliation are internal infrastructure data.
- A failed cleanup is observable work, not a swallowed warning.

## Requirements

1. Enumerate upload/delete/avatar-replacement state transitions and every crash point.
2. Persist enough metadata to identify desired state and provider object deterministically.
3. For upload, ensure a DB failure after provider success leaves durable/recoverable cleanup intent or an immediately idempotent compensation path whose failure is persisted.
4. For delete, choose a tombstone/pending-delete sequence that prevents a provider-success/DB-failure record from masquerading as downloadable content.
5. For avatar replacement, make old-object cleanup retryable without risking deletion of the new avatar.
6. Implement periodic/on-demand reconciliation with bounded batches and locks so multiple workers do not race the same item.
7. Emit metrics/logs for pending age, retries, terminal failures and repairs.
8. Add integration tests simulating provider timeout, provider success + process crash, DB rollback, duplicate retry and reconciler restart.

## Acceptance criteria

- [ ] No known partial failure leaves divergence that only a log message can repair.
- [ ] Upload/delete/profile-image commands are safely retryable.
- [ ] A reconciler can enumerate and repair outstanding DB/storage divergence.
- [ ] Reconciliation is idempotent and concurrency-safe.
- [ ] Failure states and retry age are observable.

## Validation

Run failure-injection integration tests with a deterministic fake object store, reconciler concurrency/restart tests, Nest lint/typecheck/build/tests and the full CI-parity gate.

## Browser validation

Validate ordinary upload/delete/avatar flows through `http://localhost:8888`; partial-failure/reconciliation behavior is validated through integration tests and operational state assertions rather than browser fault injection.

## Stop conditions

Mark `BLOCKED` if Dropbox APIs/account permissions do not provide a reliable stable identifier/listing primitive required for reconciliation, or if retention/deletion semantics require a human product/compliance decision.

## Dependencies

- `0176-separate-the-object-storage-port-from-document-commands.md` must be `DONE`.
- `0158` transactional outbox and `0150` migrations must be `DONE`.

## Implementation notes

Prefer explicit states such as pending/active/deleting/failed over guessing consistency from null fields. Reconciliation should compare intended database state to provider state, not perform blind cleanup scans with destructive assumptions.

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
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
