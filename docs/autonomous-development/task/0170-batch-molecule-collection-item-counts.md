# 0170 - Batch molecule-collection item counts

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Eliminate the `MoleculeCollectionResolver.itemsCount` N+1 query pattern by resolving collection item counts in one batch/aggregate per request scope or by returning a precomputed count projection with constant query growth.

Source: `DATA-021` in Series `0001`.

## Context

`MoleculeCollectionResolver.itemsCount()` currently calls `joinRepo.count({ collectionId, userId })` once for every parent collection. A list of N collections therefore adds N count queries. The resolver already has authenticated user context, and the join table carries both collection and owner identifiers, so counts can be loaded owner-scoped in one grouped query and distributed back to field resolvers.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/molecule-collection/resolvers/molecule-collection.resolver.ts`
- `MoleculeCollectionService`
- `MoleculeCollectionItemJoin` entity/repository
- GraphQL request-scoped loader/provider infrastructure
- molecule-collection GraphQL tests

## In scope

- Replace per-parent `Repository.count()` with a batched grouped count strategy.
- Preserve owner scoping in the aggregate query.
- Support zero-count collections without issuing fallback queries.
- Ensure duplicate requests for the same collection within a request are deduplicated.
- Define loader/cache lifetime as request-scoped; do not leak counts across users or mutations.
- Add query-count tests proving constant/bounded SQL calls as parent count increases.

## Out of scope

- Do not denormalize a persistent `itemsCount` column unless measurement demonstrates that a request-scoped aggregate is insufficient.
- Do not redesign collection pagination or join bulk commands.
- Do not add global cross-request caching of owner-sensitive counts.

## Decisions already made

- Query count must not grow linearly with the number of returned collections.
- Counts are owner-scoped and zero is a valid explicit result.
- Any DataLoader/request cache is isolated to one GraphQL request/auth context.

## Requirements

1. Measure the current query count for a list requesting `itemsCount` for 1, 10 and 100 collections.
2. Implement a grouped query equivalent to `COUNT(*) GROUP BY collection_id` constrained by the authenticated owner and requested IDs.
3. Map absent group rows to zero.
4. Integrate through a request-scoped loader or a collection read projection without coupling the resolver to raw repository access.
5. Ensure loader keys include or are structurally scoped to the authenticated user.
6. Invalidate/reload naturally after mutation by request boundary; do not keep stale process-global values.
7. Add integration tests asserting both values and maximum SQL-query count.

## Acceptance criteria

- [x] Requesting `itemsCount` for many collections no longer issues one count query per collection.
- [x] Counts remain correct for empty, populated and mixed collections.
- [x] Cross-owner collection IDs cannot influence or expose counts.
- [x] Query-count tests fail if the N+1 pattern returns.

## Validation

Run molecule-collection resolver/integration tests with SQL query instrumentation, Nest lint/typecheck/build/tests and the full CI-parity gate.

## Browser validation

If the collection UI renders `itemsCount`, validate the relevant list/detail view through `http://localhost:8888` and confirm counts update correctly after a join mutation.

## Stop conditions

Mark `BLOCKED` only if the GraphQL runtime prevents request-scoped batching with the current context architecture and the alternative projection requires a broader API contract decision.

## Dependencies

- `0143` canonical pagination/query conventions should be `DONE` where applicable.
- Database indexes from `0151` should cover the grouped join lookup.

## Implementation notes

A single `WHERE user_id = :userId AND collection_id IN (...) GROUP BY collection_id` query is preferable to clever caching. Optimize the database work first; cache only within the request.

## Execution notes

### Feature branch
`feature/DATA-021` preserved and frozen at
`46f4f9322c2f2c4df18000588288a30c8fe5ecea`.
### Preflight
- Base SHA `420a7b65b3b84cc247d9cbc6c3518e776d4d16a1` was clean and exact
  Actions run `35285854434` had a green Required gate.
- Runtime readiness passed through the canonical nginx edge. Authenticated
  browser acceptance could not be completed because the supported credential
  entry bridge was unavailable without exposing the local test credential.
### Preflight remediation
_None._
### Summary
Implemented a request-scoped, owner-keyed grouped count loader with duplicate
key deduplication, zero mapping, and focused query-count tests. The task is
`BLOCKED` because authenticated collection UI and post-mutation browser
evidence could not be obtained.
### Task-specific validation performed
- Focused loader and GraphQL resolver contract tests passed.
- Nest typecheck, lint and build passed.
### Full pre-merge CI-parity validation
- Not run because the task was blocked before integration.
### Browser validation performed
- Runtime readiness passed, but authenticated collection UI and post-mutation
  count refresh were not validated. No browser acceptance result is claimed.
### Commits
Implementation commit `942409474db8db191ee5e49452c0da1baeeb482a` and status
commit `46f4f9322c2f2c4df18000588288a30c8fe5ecea` remain preserved on
`feature/DATA-021`; blocked status is recorded on `develop`.
### Merge / CI
No merge; this is task-status metadata on `develop`.
### Rollback
_Not applicable._
### Blocker / human decision required
Authenticated browser capability/credential-entry recovery is required before
this task can be changed to `DONE`; the preserved feature branch must not be
resumed without new direct human authorization.

### Manual recovery 2026-09-20
- Direct human authorization resumed the preserved feature branch and merged
  current `develop` into it with a no-fast-forward merge.
- Focused loader and resolver-contract validation passed (2 suites, 11 tests),
  including constant single-query behavior for 1, 10 and 100 keys, zero
  mapping, duplicate-key deduplication and owner isolation.
- Nest typecheck, lint and build passed after the recovery merge.
- The canonical runtime reached two consecutive readiness rounds through
  `http://localhost:8888`. In an authenticated browser session, the empty
  `DATA023 Ownership Smoke` collection visibly changed from 0 to 1 after a
  ChEMBL join mutation and back to 0 after removal. Cleanup restored the
  original data, with no browser console or page errors.
- The historical capability blocker is resolved; final DONE status remains
  subject to exact feature-SHA and post-merge-SHA Required gate success.
