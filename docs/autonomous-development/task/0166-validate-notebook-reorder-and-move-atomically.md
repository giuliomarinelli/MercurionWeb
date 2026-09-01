# 0166 - Validate Notebook reorder and move commands atomically

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make Notebook reorder/move commands validate duplicate IDs, complete sibling membership, ownership, parent identity and move-neighbor eligibility inside the same transaction as the write so invalid, stale or cross-owner input produces no partial structural change.

Source: `DATA-017` in Series `0001`.

## Context

Current reorder methods update only rows matching parent/user/`IN(ids)` and therefore do not prove that the provided list is unique or represents the complete sibling set. A partial list can leave untouched positions, unknown/cross-owner IDs can simply disappear from the update count, and move logic reads the item/neighbor independently of a shared ordered-tree command policy. The Series requires reorder input to be complete and ownership-safe. `0164` centralizes the ordered-tree command seam and `0165` makes its bulk write parameter-safe; this task defines command validity.

## Relevant files and modules

- ordered-tree domain/repository from `0164`
- safe reorder execution from `0165`
- Chapter/Section/Page services and resolvers
- Notebook hierarchy entities
- Unit of Work from `0152`
- public-ID validator from `0149`
- ordered-tree validation/integration tests

## In scope

- Define one typed reorder command contract for a parent + ordered sibling ID list.
- Reject duplicate IDs before performing any write.
- Inside the active transaction, load the authoritative sibling set for the specified parent/owner and require the reorder list to contain exactly that set once each.
- Reject missing, unknown, cross-parent and cross-owner IDs atomically.
- Validate that the target parent itself belongs to the authenticated owner before mutating descendants.
- Make up/down move load and validate the item and eligible neighbor under the same parent/owner transaction context.
- Define deterministic no-neighbor semantics for moving the first item up/last item down while distinguishing that valid no-op from invalid input.
- Add stale/concurrent-command tests that prove validation and write do not become separate TOCTOU phases.

## Out of scope

- Do not decide the final lock/unique-order implementation for competing *valid* commands; `0167` owns concurrency serialization and the DB sibling-order invariant.
- Do not accept partial reorder as a convenience API; the Series explicitly requires complete-set validation.
- Do not infer ownership from a client-provided user/parent field when the database relationship can establish it.
- Do not silently discard invalid IDs and reorder the remaining rows.

## Decisions already made

- Reorder is a replace-order command for the complete current sibling set of one parent.
- Every sibling ID appears exactly once in valid reorder input.
- Parent membership and ownership are server-derived and verified in the write transaction.
- Invalid input has all-or-nothing semantics: zero structural writes.
- Move operates only between siblings sharing the same parent and owner.

## Requirements

1. Define a common ordered-tree reorder/move command API that receives authenticated owner, parent identity and item IDs using canonical public-ID/value types.
2. Reject empty/duplicate/malformed lists according to the declared command contract before issuing a structural update; if an empty sibling set has no meaningful reorder command, return the approved validation outcome rather than silently succeeding.
3. Within one Unit of Work transaction, query the parent/owner and the authoritative current sibling IDs.
4. Compare input and persisted sibling sets exactly: equal cardinality, no duplicates, no unknown IDs, no omitted IDs, no IDs belonging to another parent/owner.
5. Keep validation rows protected with the locking/read strategy required to prevent them changing between validation and the current task's write; coordinate the final locking mechanism with `0167` rather than performing an unlocked check-then-update.
6. For move, load the source item plus nearest eligible neighbor within the same parent/owner scope and distinguish invalid/missing source from valid boundary no-op.
7. Ensure any validation failure is a typed application error and causes rollback/no update.
8. Add integration tests for duplicates, omitted sibling, extra/unknown ID, cross-parent ID, cross-owner ID, stale list, invalid parent, first-up/last-down no-op and rollback after a post-validation failure.
9. Exercise the same validation contract against Chapter, Section and Page adapters.

## Acceptance criteria

- [ ] Reorder succeeds only when input IDs exactly equal the current authorized sibling set.
- [ ] Duplicate, missing, unknown, cross-parent and cross-owner IDs cause zero structural writes.
- [ ] Move source and neighbor are verified as authorized siblings in the same transaction.
- [ ] Boundary move no-op behaviour is explicit and tested rather than confused with invalid input.
- [ ] Validation and write share one Unit of Work transaction.
- [ ] Chapter, Section and Page use identical structural validation semantics.

## Validation

Run ordered-tree command validation tests plus real-DB transactional tests for every invalid matrix case, Notebook resolver/service tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an existing public consumer intentionally sends partial reorder lists and the product contract must choose between backward compatibility and the Series complete-set invariant; do not silently reinterpret partial input as complete reorder.

## Dependencies

- `0152-introduce-canonical-typeorm-unit-of-work.md`, `0164-introduce-notebook-ordered-tree-domain.md` and `0165-parameterize-notebook-reorder-sql.md` must be `DONE`.

## Implementation notes

Do not perform a preflight `exists()` check outside the transaction and consider that authorization. The authoritative set comparison belongs inside the exact transaction that applies the order change.

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
