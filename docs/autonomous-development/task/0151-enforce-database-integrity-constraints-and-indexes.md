# 0151 - Enforce database integrity constraints and indexes

- [x] DONE
- [ ] BLOCKED
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
- Authorized recovery resumed preserved SHA
  `d163d4189821d2f2f09e4901ab0a6a4ee3254a92` and merged current green
  `develop` SHA `f86b60e8eec8d6f41eb774abc76720a5d47a5f54` with
  `--no-ff --no-gpg-sign`.
- Exact base full CI run `35001367196` succeeded with Windows, Ubuntu and
  Required gate green.
- Dependency `0150-establish-versioned-typeorm-migrations.md` is `[x] DONE`.
- The real isolated npm capability probe passed and its exact temporary
  directory was removed; repository status remained identical.
### Preflight remediation
None.
### Summary
Added a versioned integrity migration and matching TypeORM metadata for SSO
identity uniqueness, molecule collection ownership keys, join uniqueness,
composite ownership foreign keys, closed synthesis values and non-negative
ordering. Query-backed collection/item/join and SSO indexes are named and
documented in the production entity inventory.

The migration deterministically reconciles the historical blocker: when
collection and item owners agree it repairs the denormalized join owner; when
the parents have different owners it removes the association already forbidden
by the domain. The canonical PostgreSQL schema check now verifies the migration
backfill, exact schema objects, concurrent uniqueness, invalid ownership and
transaction rollback behavior.
### Task-specific validation performed
- `npm run migration:check --workspace mercurion_web_node` passed against a
  disposable PostgreSQL/pgvector database with both migrations and zero schema
  drift. Backfill, metadata, ownership, concurrency and rollback probes passed.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run lint --workspace mercurion_web_node` passed with zero warnings.
- Complete Nest unit suite passed: 157 suites, 509 tests.
- Complete Nest E2E suite passed: 1 suite, 3 tests.
- `npm run build --workspace mercurion_web_node` passed.
- `npm run ci:nest:architecture` passed.
- `git diff --check` passed; the disposable database container was removed.
### Full pre-merge CI-parity validation
Exact feature SHA `c66e87c93c8bf99fac006177a99664201499e5b8` passed the
complete GitHub Actions workflow in run `35004093050`, including PostgreSQL
schema validation and the stable Required gate. The preceding run
`35003603649` exposed an unregistered TypeORM migration entrypoint; the narrow
reachability correction passed locally and in the replacement run. Local
`npm ci` and `npm run ci:check` were not run; clean-install aggregate evidence
belongs to GitHub Actions.
### Browser validation performed
_Not applicable._
### Commits
`d163d4189821d2f2f09e4901ab0a6a4ee3254a92` — preserved blocking diagnosis.

`b6fd338e4a46ae52058956dd7f492d2d48e70ecd` — migration, entity metadata,
inventory and PostgreSQL integrity probe.

`895c2fba263b4d5dd6ea806e1aac9668c3027f9d` — recovery evidence and reset of
the 19 dependency skips made stale by DATA-002 becoming `DONE`.

`c66e87c93c8bf99fac006177a99664201499e5b8` — TypeORM migration reachability
registration after the first feature-CI diagnostic.
### Merge / CI
Merged into `develop` with `--no-ff --no-gpg-sign` as
`097a10118938f981bb727ad8efff7b762e567c98`. Exact merge-SHA full CI passed in
run `35004741664`, including Windows, Ubuntu, container builds, Angular and
Nest tests/builds, PostgreSQL migration/integrity probes, and Required gate.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
