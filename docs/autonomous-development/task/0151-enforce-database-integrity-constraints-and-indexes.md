# 0151 - Enforce database integrity constraints and indexes

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Move persistence invariants that must survive concurrency and alternate code paths into explicit database foreign keys, unique/check constraints and workload-backed indexes, all delivered through migrations and verified against a real database.

Source: `DATA-002` in Series `0001`.

## Context

The repository already contains some entity indexes, for example Help ticket/message access paths and unique indexes in selected domains, but integrity still depends partly on application checks. Once `0150` establishes migrations, schema invariants must no longer rely on a specific service checking first. This task is repository-wide, but specialized Notebook sibling-order constraints are finalized in `0167` after the ordered-tree semantics are defined.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/**/Models/entities/`
- migrations introduced by `0150`
- TypeORM relations and repository query builders
- auth/SSO identity entities
- molecule-collection join entities
- Help entities
- Notebook entities
- integration/concurrency test infrastructure

## In scope

- Inventory entity relationships, natural uniqueness rules, domain-value constraints and hot lookup/order predicates.
- Ensure required foreign keys have explicit delete/update behaviour and supporting indexes where justified.
- Add unique constraints for identities/joins/keys that must never duplicate under concurrent requests.
- Add check constraints for closed domain invariants that are valid at the SQL boundary.
- Add lookup/order indexes from real query predicates rather than blanket-indexing every column.
- Deliver every schema change as a versioned migration.
- Add integration and race tests that bypass application pre-checks and prove the DB rejects invalid/duplicate writes.

## Out of scope

- Do not invent uniqueness rules when duplicate values may be legitimate product behaviour.
- Do not add speculative indexes without a known query/use case.
- Do not solve Notebook sibling-order concurrency here; `0167` owns the final parent/order invariant and locking strategy.
- Do not alter data ownership semantics without an approved domain rule.

## Decisions already made

- Database invariants are authoritative for conditions that must hold under concurrency.
- Application validation improves errors/UX but does not replace a required DB constraint.
- Constraint and index names are stable and migration-controlled.
- Constraint failures are translated into typed application errors at the persistence boundary rather than leaking raw driver text.

## Requirements

1. Produce an inventory mapping each production entity to primary keys, foreign keys, uniqueness rules, domain checks and principal lookup/order predicates.
2. Compare that inventory to actual TypeORM metadata/migrations and classify each gap as required, intentionally application-only, or not applicable.
3. Add required constraints/indexes through migrations, including safe handling for existing rows that violate a newly enforced invariant.
4. Ensure multi-column ownership relationships cannot create cross-owner joins when the database can enforce the relationship safely.
5. Add concurrent insert/update tests for uniqueness-sensitive identity and join records.
6. Add negative integrity tests for invalid foreign keys/check values and verify rollback leaves no partial rows.
7. Add a schema metadata/integration check to canonical CI so required named constraints/indexes cannot disappear silently.

## Acceptance criteria

- [ ] Required foreign keys, unique constraints, domain checks and workload-backed indexes are explicit in migrations/schema.
- [ ] Concurrency cannot create duplicate rows for declared unique business identities/joins.
- [ ] Invalid relationships fail at the database boundary even when application pre-checks are bypassed.
- [ ] Constraint failures map to stable typed application errors where surfaced publicly.
- [ ] No speculative or duplicate indexes are introduced without an identified workload.
- [ ] Fresh-schema CI from `0150` includes all new constraints and indexes.

## Validation

Apply migrations to a fresh disposable database; run integrity and parallel-write tests, migration/schema-drift checks, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if existing persisted data violates a required new constraint and no approved cleanup/backfill policy exists, or if a supposed uniqueness/ownership rule is product-ambiguous.

## Dependencies

- `0150-establish-versioned-typeorm-migrations.md` must be `DONE` first.

## Implementation notes

Prefer constraints that encode stable domain truth. Do not attempt to encode every application workflow in SQL merely because a CHECK expression is technically possible.

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
