# 0173 - Define snapshot-bounded idempotent select-all semantics

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Give every molecule bulk command using `selectAll` an explicit filter/snapshot, maximum work bound, atomicity and retry contract so a retry is deterministic, does not duplicate joins and does not silently include rows that appeared after the original selection.

Source: `DATA-024` in Series `0001`.

## Context

Current join commands interpret `selectAll` by issuing a fresh query for all owner rows and applying the explicit ID list as exclusions. There is no durable selection snapshot, maximum candidate count or request idempotency key. A retry can therefore operate on a different population if collections/items were created between attempts. Database uniqueness prevents duplicate join rows, but that alone does not make the business command replay deterministic.

## Relevant files and modules

- `MoleculeCollectionItemJoinService`
- bulk GraphQL DTOs/resolvers
- molecule collection/item repositories
- ownership policy from `0172`
- Unit of Work from `0152`
- database constraints from `0151`

## In scope

- Define the exact meaning of `selectAll` as a filter evaluated against an explicit snapshot boundary.
- Define an upper bound on candidates/work per command and a typed over-limit result.
- Define exclusion semantics for explicit IDs.
- Make retries idempotent using a command/idempotency identity or a stable snapshot token as appropriate.
- Ensure rows created after the captured snapshot are not unexpectedly included in a retry.
- Preserve atomicity for the final write set.
- Add concurrency/retry tests with rows inserted or deleted between attempts.

## Out of scope

- Do not implement a general background bulk-job system unless the approved maximum cannot be handled synchronously.
- Do not change UI selection semantics beyond what is required to represent the snapshot/idempotency contract.
- Do not rely only on `orIgnore()` as the definition of idempotency.

## Decisions already made

- `selectAll` is not an unbounded alias for “whatever exists when each retry happens”.
- Every synchronous bulk operation has a finite maximum work set.
- Database uniqueness is the final duplication guard but command replay semantics must be explicit above it.

## Requirements

1. Inventory every current `selectAll` bulk command and its filters/exclusions.
2. Choose a stable snapshot boundary compatible with the supported database and current entity IDs/timestamps (for example an upper UUIDv7/time watermark or database snapshot semantics), and document it.
3. Include the snapshot/filter identity in the command input or server-side idempotency record so retries reuse it.
4. Query candidates in deterministic order and reject/redirect work above the configured maximum before writes begin.
5. Resolve ownership through `0172` and compute the final write set through the decomposition from `0171`.
6. Make repeated execution with the same idempotency identity return the same logical result without new joins.
7. Add tests for concurrent insert/delete, retry after timeout, duplicate submission and over-limit behavior.

## Acceptance criteria

- [ ] `selectAll` has a documented, testable snapshot/filter meaning.
- [ ] Bulk commands cannot process an unbounded number of rows synchronously.
- [ ] Retrying the same logical command cannot add newly appeared rows or duplicate prior joins.
- [ ] Explicit exclusions are deterministic across retry.
- [ ] Concurrent changes are covered by integration tests.

## Validation

Run focused bulk integration/concurrency tests against the supported database, GraphQL contract tests, Nest lint/typecheck/build/tests and the repository-wide CI-parity gate.

## Browser validation

Validate the UI `selectAll` flows through `http://localhost:8888`, including normal completion and the user-visible behavior for an over-limit command if exposed synchronously.

## Stop conditions

Mark `BLOCKED` if product semantics require truly unbounded “all current and future matching rows” behavior or if the maximum synchronous work limit needs a human product/operations decision not defined elsewhere.

## Dependencies

- `0171-decompose-molecule-bulk-join-planning-and-write-sets.md` and `0172-centralize-molecule-domain-ownership-policy.md` must be `DONE`.
- `0151`/`0152` database constraints and Unit of Work must be `DONE`.

## Implementation notes

Prefer a compact server-verifiable snapshot descriptor over persisting thousands of selected IDs when the domain's monotonic UUIDv7/timestamp ordering can define the same closed population safely. Prove the chosen boundary with tests rather than assuming it.

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
_Not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0151` (DATA-002, SKIPPED_DEPENDENCY), `0152` (DATA-003, SKIPPED_DEPENDENCY), `0171` (DATA-022, SKIPPED_DEPENDENCY), `0172` (DATA-023, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0152 DATA-003 SKIPPED_DEPENDENCY -> 0173 DATA-024 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
