# 0151 - Enforce database integrity constraints and indexes

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Move persistence invariants that must survive concurrency and alternate code paths into explicit database foreign keys, unique/check constraints and workload-backed indexes, all delivered through migrations and verified against a real database.

Source: `DATA-002` in Series `0001`.

## Context

The repository already contains some entity indexes, for example Help ticket/message access paths and unique indexes in selected domains, but integrity still depends partly on application checks. Once `0150` establishes migrations, schema invariants must no longer rely on a specific service checking first. The deferred Notebook program owns its own sibling-order constraints and migrations.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/**/Models/entities/`
- migrations introduced by `0150`
- TypeORM relations and repository query builders
- auth/SSO identity entities
- molecule-collection join entities
- Help entities
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
- Do not introduce constraints for the deferred Notebook domain.
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
`feature/DATA-002`
### Preflight
- Branch, base and cleanliness:
  `git rev-parse --abbrev-ref HEAD` returned `feature/DATA-002`;
  `git rev-parse develop` and `git rev-parse HEAD` both returned
  `9bc8197d552141b83223353ae78331031febdcbd`; `git status --short --branch`
  was clean.
- Exact base Actions evidence: `gh run list --commit
  9bc8197d552141b83223353ae78331031febdcbd --limit 10` reported successful
  run `34969281141` for the `develop` merge.
- Dependency `0150-establish-versioned-typeorm-migrations.md` is `[x] DONE`.
- No Tox21, Nest or Angular runtime was started by this task. Process
  inspection found Chrome DevTools MCP processes and a pre-existing Angular
  test process (`ng test --watch=false ...dashboard-widget.mappers.spec.ts`);
  no task-owned process was started or stopped.
- The entity/migration inventory identified existing named foreign keys,
  unique constraints, checks and workload indexes in the `0150` baseline, but
  also identified application/schema gaps in SSO identity uniqueness and
  molecule-collection ownership enforcement.
### Preflight remediation
None.
### Summary
`BLOCKED` before implementation per the recipe stop condition. A read-only
query against the configured development PostgreSQL database found `307`
existing cross-owner molecule-collection joins:
`molecule_collection_items_join.user_id` differs from the owning collection
or item owner. The database also returned zero duplicate identity keys, zero
duplicate join keys and zero orphan join references, but the 307 ownership
violations prevent safely adding the required multi-column ownership
relationship constraint. No approved cleanup, backfill, or data-ownership
policy is present in this task or the repository. Adding a migration that
would reject those persisted rows would therefore be unsafe.

The canonical `npm run migration:drift --workspace mercurion_web_node`
against the configured development database also failed with pre-existing
schema drift and listed live constraints/indexes not represented by the
`0150` entity metadata baseline; it was not used to mutate the database.
### Task-specific validation performed
Read-only database evidence only:

```text
auth_identity_duplicates=0
join_duplicates=0
join_orphans=0
join_cross_owner=307
synthesis_duplicates=0
step_duplicates=0
item_duplicates=0
```

No migration, source test, or schema mutation was run.
### Full pre-merge CI-parity validation
Not run. Local `npm ci` and `npm run ci:check` are forbidden, and the task
was blocked before implementation.
### Browser validation performed
_Not applicable._
### Commits
Blocking diagnostic commit on `feature/DATA-002` (below).
### Merge / CI
Not applicable before integration; the diagnostic feature SHA is pushed for
preservation.
### Rollback
_Not applicable._
### Blocker / human decision required
The database/domain owner must approve a non-destructive cleanup/backfill and
ownership reconciliation policy for the 307 existing cross-owner joins, or
explicitly redefine the ownership invariant. After that decision, rerun the
inventory and add only constraints whose product semantics and existing-row
handling are approved.
