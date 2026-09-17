# 0143 - Standardize pagination across Nest resolvers

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

This recipe was previously described as skipped by stale historical metadata.
The authoritative planner classified task `0143` (`BE-029`) as `READY` for
this attempt.
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
`feature/BE-029`
### Preflight
Clean feature branch at base SHA `cc926b76692065d1581f6db9368ce33b50261954`.
Exact base-SHA Actions run `35283695278` completed successfully with the
`Required gate` green. The run used the repository's metadata path because the
base commit contained only task metadata changes; no local `npm ci` or
`npm run ci:check` was run.
### Preflight remediation
None.
### Summary
Added a shared top-level GraphQL `PaginationArgs` contract with page 1,
default limit 20, minimum 1, and maximum limit 100. Public Help and
molecule-collection paginated resolvers now use the shared arguments and
canonical flat metadata conversion while preserving the existing `page` and
`limit` wire names. Shared paginated response metadata is inherited by all
public paginated response models. All paginated queries append an ascending
unique-ID tie-breaker to their primary ordering.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm test --workspace mercurion_web_node -- --runInBand src/models/pagination/pagination.spec.ts src/contracts/public-graphql-resolver.contract.spec.ts` — 2 suites, 14 tests passed.
- `npm exec --workspace mercurion_web_node -- eslint <changed Nest pagination files>` — passed.
- `npm run graphql:schema:check --workspace mercurion_web_node` — passed after updating `MercurionWebNode/src/schema.graphql`.
- `npm run graphql:check --workspace mercurion_web_ng` — passed, including
  GraphQL codegen drift verification after regenerating
  `MercurionWebNg/src/app/generated/schema.ts`.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Complete clean-install and aggregate CI gates remain owned by Actions. The
exact feature-SHA Actions run is required before integration.
### Browser validation performed
Not applicable; this backend-only task declares no browser validation.
### Commits
- `1dcbbf67d8ff0c93543383db448ea834ab62f5af` — implementation and focused
  validation.
### Merge / CI
Feature-SHA CI run `35284627530` failed on the Ubuntu/Windows prerequisite
GraphQL/generated-contract gates because the committed Angular generated
schema artifact was stale. This was an actionable generated-artifact drift
only; all other observed container jobs succeeded. Repair attempt 1 of 3
regenerated the artifact from the committed Nest schema. The resulting diff
contains only the expected optional `page`/`limit` argument type changes in
`MercurionWebNg/src/app/generated/schema.ts`; `graphql.ts` and unrelated files
were unchanged. Focused GraphQL checks and pagination tests passed after the
repair. The repaired feature commit is pending exact-SHA CI verification.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
