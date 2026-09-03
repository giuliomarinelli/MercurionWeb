# 0167 - Enforce concurrent Notebook sibling-order invariants

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Make Chapter/Section/Page sibling ordering remain unique and deterministic under concurrent create, move and reorder commands by combining an explicit database invariant with a transaction/locking strategy appropriate to the supported SQL dialect.

Source: `DATA-018` in Series `0001`.

## Context

Ordered child creation currently calculates `MAX(order) + 1`; two concurrent creates can therefore choose the same next position. Move swaps two values and reorder rewrites many values, but there is no explicit unique sibling-order invariant visible in the current schema. A naive unique `(parent_id, order)` constraint can itself make ordinary swaps fail if intermediate updates collide. Tasks `0164–0166` establish one ordered-tree domain, parameter-safe bulk updates and complete-set validation; this task makes valid concurrent commands serializable and protects the invariant at the database boundary.

## Relevant files and modules

- ordered-tree domain/repository from `0164–0166`
- Notebook Chapter/Section/Page entities
- migrations from `0150`
- integrity constraints from `0151`
- supported DB dialect/configuration from `0150`
- Unit of Work from `0152`
- concurrency/integration test infrastructure

## In scope

- Define the exact sibling-order invariant for each ordered level, including whether positions must be contiguous and the canonical first position.
- Add a migration-backed uniqueness/integrity constraint scoped to the correct parent for Chapter, Section and Page.
- Serialize concurrent sibling-set mutations with a database-supported lock/isolation strategy.
- Replace unlocked `MAX(order) + 1` creation with a safe parent-scoped allocation performed under that serialization strategy.
- Make move/reorder update positions without violating the unique constraint at intermediate statement/row-update stages.
- Handle supported-dialect differences explicitly; use deferrable constraints only if the supported DB contract actually guarantees them, otherwise use a portable/two-phase collision-safe strategy.
- Add parallel create/move/reorder tests and assert the final sibling set satisfies the declared invariant.

## Out of scope

- Do not add ordering to root `LabNotebook` if the product does not currently define it.
- Do not use process-local mutexes as the correctness mechanism; multiple application replicas must remain safe.
- Do not solve collisions by dropping the unique DB invariant and trusting application code.
- Do not silently switch production database dialects to gain a convenient locking feature.
- Do not permit unexpected permanent gaps merely to avoid implementing safe reordering; any gap policy must be explicit in the invariant.

## Decisions already made

- The database enforces uniqueness of sibling positions within the appropriate parent scope.
- All commands mutating one sibling set coordinate through the same parent-scoped serialization mechanism.
- `MAX + 1` without a lock/isolation invariant is not acceptable.
- Valid move/reorder algorithms must remain compatible with the uniqueness constraint throughout execution, not only at commit unless the chosen supported constraint is explicitly deferred.
- Concurrency correctness must hold across processes/replicas.

## Requirements

1. From the active database support decision established in `0150`, choose and document the parent-scoped serialization primitive (for example row-level parent lock, advisory lock with stable parent key, serializable transaction or an equivalent supported mechanism).
2. Define the canonical order domain for each level (for example contiguous integer positions starting at the established current base) and test it explicitly.
3. Add migration-backed unique sibling-order constraints for Chapters under one Notebook, Sections under one Chapter and Pages under one Section; include owner columns only if they are genuinely required by the relational key rather than duplicating parent ownership.
4. Before adding constraints, provide a deterministic migration/backfill for any existing duplicate or invalid positions; do not let the migration arbitrarily reorder live siblings without a documented stable tie-break.
5. Make create acquire the parent-scoped serialization guarantee before reading/allocating the next position.
6. Make move/reorder acquire the same guarantee before the authoritative set validation from `0166` and retain it until commit.
7. Implement a collision-safe position rewrite. If using temporary positions/two-phase updates, ensure temporary values cannot escape commit and remain inside allowed column/check semantics; if using a deferrable unique constraint, prove it is supported/configured and checked at commit.
8. Add parallel tests for many creates under one parent, opposing simultaneous moves, simultaneous complete reorders and create-vs-reorder races.
9. After every race test assert: exactly the expected sibling identities exist; all belong to the same authorized parent; every position is unique; positions satisfy the declared contiguous/gap policy; no transaction leaks partial temporary positions.
10. Add a CI integration gate for these concurrency invariants on the canonical supported database engine.

## Acceptance criteria

- [ ] The database schema explicitly prevents duplicate sibling positions for Chapter, Section and Page.
- [ ] Concurrent creates cannot allocate the same sibling order.
- [ ] Concurrent move/reorder/create operations serialize or conflict/retry deterministically without corrupting order.
- [ ] Valid move/reorder operations do not fail because of transient uniqueness collisions in their own algorithm.
- [ ] Final sibling positions satisfy the documented contiguous/gap invariant after every tested race.
- [ ] Correctness does not depend on a single Node process.
- [ ] Fresh migration + parallel integration tests run in canonical CI.

## Validation

Apply migrations to a fresh disposable database, run high-concurrency ordered-tree integration tests for Chapter/Section/Page, verify constraint metadata and final order invariants, then run Notebook tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if multiple SQL dialects remain officially supported and require incompatible uniqueness/locking semantics with no approved portability strategy, or if existing production sibling positions contain ambiguous duplicates/gaps whose repair order cannot be derived safely from authoritative data.

## Dependencies

- `0150-establish-versioned-typeorm-migrations.md`, `0151-enforce-database-integrity-constraints-and-indexes.md` and `0152-introduce-canonical-typeorm-unit-of-work.md` must be `DONE`.
- `0164-introduce-notebook-ordered-tree-domain.md`, `0165-parameterize-notebook-reorder-sql.md` and `0166-validate-notebook-reorder-and-move-atomically.md` must be `DONE`.

## Implementation notes

Be careful with ordinary immediate unique constraints during a two-row swap: updating position A to B before B moves can violate uniqueness even inside one transaction. The chosen algorithm and constraint timing must be tested together, not reasoned about independently.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0150` (DATA-001, SKIPPED_DEPENDENCY), `0151` (DATA-002, SKIPPED_DEPENDENCY), `0152` (DATA-003, SKIPPED_DEPENDENCY), `0164` (DATA-015, SKIPPED_DEPENDENCY), `0165` (DATA-016, SKIPPED_DEPENDENCY), `0166` (DATA-017, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0150 DATA-001 SKIPPED_DEPENDENCY -> 0167 DATA-018 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
