# 0143 - Standardize pagination across Nest resolvers

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Replace duplicated GraphQL `page`/`limit` arguments and divergent pagination response shapes with one validated pagination contract that enforces min/max/defaults and stable ordering while preserving approved public schema compatibility.

Source: `BE-029` in Series `0001`.

## Context

Resolvers such as Help and MoleculeCollection currently declare `@Args('page')` and `@Args('limit')` independently, with differing defaults/requiredness, then convert `nestjs-typeorm-paginate` results through local helpers. This duplicates validation and makes stable ordering/limits a caller-by-caller concern.

## Relevant files and modules

- GraphQL resolvers with pagination arguments
- pagination helpers/models in `MercurionWebNode/src/`
- `nestjs-typeorm-paginate` usages
- GraphQL generated schema and resolver tests

## In scope

- Define one reusable typed GraphQL pagination args/input contract with explicit defaults and min/max limits.
- Preserve existing top-level `page`/`limit` schema shape when possible (for example via shared `@ArgsType`) rather than introducing an unnecessary breaking nested input.
- Define one canonical page/page-info response model.
- Require deterministic stable ordering for every paginated query, including a unique tie-breaker.
- Migrate all public paginated resolvers to the canonical contract.
- Add boundary/ordering/schema tests.

## Out of scope

- Do not redesign domain query/filter semantics unrelated to paging.
- Do not introduce cursor pagination unless a separate approved API decision requires it.
- Do not silently break existing GraphQL client argument names.

## Decisions already made

- Pagination validation/defaults have one owner.
- Every paginated result has deterministic ordering.
- All resolvers expose the same pagination metadata semantics.

## Requirements

1. Inventory every resolver/page helper and current default/max/order behaviour.
2. Define validated `page >= 1` and a bounded `limit` with one documented default/max.
3. Preserve current wire argument names unless versioning explicitly allows a schema change.
4. Define stable sort requirements; append a unique ID tie-breaker when the primary sort is not unique.
5. Normalize `nestjs-typeorm-paginate`/query-builder results into one response model.
6. Add table-driven tests for defaults, minimum, maximum, overflow/invalid values and stable repeated page queries.
7. Update GraphQL schema/contract snapshots and canonical CI validation.

## Acceptance criteria

- [ ] Public paginated resolvers use one pagination args/input type.
- [ ] Limits/defaults/minimum are identical and validated centrally.
- [ ] Every page query has deterministic stable ordering.
- [ ] Page response metadata has one shape/meaning.
- [ ] Existing approved GraphQL consumers remain compatible or an explicit versioned migration exists.

## Validation

Run resolver/pagination tests, GraphQL schema drift check, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable; GraphQL integration tests must prove transport behaviour.

## Stop conditions

Mark `BLOCKED` if two public endpoints intentionally require incompatible pagination wire contracts and unifying them would be a breaking API decision not covered by current versioning policy.

## Dependencies

- `0008` GraphQL schema drift CI gate and `0126` thin resolver/controller work should be `DONE`.

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

- Direct terminal prerequisite(s): `0008` (SYS-008, BLOCKED), `0126` (BE-012, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0143 BE-029 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
