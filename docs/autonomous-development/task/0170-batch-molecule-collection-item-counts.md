# 0170 - Batch molecule-collection item counts

- [ ] DONE
- [x] BLOCKED
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

- [ ] Requesting `itemsCount` for many collections no longer issues one count query per collection.
- [ ] Counts remain correct for empty, populated and mixed collections.
- [ ] Cross-owner collection IDs cannot influence or expose counts.
- [ ] Query-count tests fail if the N+1 pattern returns.

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
`feature/DATA-021`
### Preflight
- Confirmed clean `feature/DATA-021` at base SHA
  `420a7b65b3b84cc247d9cbc6c3518e776d4d16a1`.
- Exact base-SHA GitHub Actions run `35285854434` completed successfully
  with the Required gate green.
- Focused runtime preflight started Tox21, Nest, and Angular in the
  canonical order. Nest compiled with zero errors, Angular completed its
  development build, and two consecutive nginx rounds returned 200 from
  `/health` and `/`.
- Browser capability surface was callable. Fresh authenticated browser
  evidence could not be completed because the supported credential-entry
  bridge could not safely transfer the local test credential into the
  browser tool; no credential was emitted.
### Preflight remediation
_None._
### Summary
Replaced the resolver's per-collection count query with a request-scoped
owner-keyed loader. Requests are grouped by authenticated owner and queried
with one `COUNT(*) GROUP BY collection_id` aggregate per owner; missing rows
resolve to zero and duplicate keys share one promise.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand
  --runTestsByPath
  src/app_modules/molecule-collection/services/molecule-collection-item-count.loader.spec.ts`
  passed 5 tests, including query-count cases for 1, 10, and 100 collections.
- `npm test --workspace mercurion_web_node -- --runInBand
  --runTestsByPath src/contracts/public-graphql-resolver.contract.spec.ts`
  passed 6 tests after registering the new loader test double.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run lint --workspace mercurion_web_node -- --no-warn-ignored` passed.
- `npm run build --workspace mercurion_web_node` passed.
### Full pre-merge CI-parity validation
_Not started._
### Browser validation performed
Canonical runtime readiness was proven through `http://localhost:8888`, but
the authenticated collection UI and post-mutation count refresh were not
validated because supported credential entry was unavailable. No browser
acceptance result is claimed.
### Commits
Implementation commit `942409474db8db191ee5e49452c0da1baeeb482a` created on
`feature/DATA-021` with `--no-gpg-sign` and pushed to `origin`.
Execution-status metadata is recorded in the follow-up commit on the same
branch.
### Merge / CI
Pending coordinator integration and exact feature-SHA CI.
### Rollback
_Not applicable._
### Blocker / human decision required
Authenticated browser acceptance remains unverified. The canonical runtime and
nginx edge were healthy, and Chrome DevTools was callable, but the supported
credential-entry bridge was unavailable without exposing the local test
credential. No browser result is claimed; human-authorized browser capability
recovery is required before changing this task to `DONE`.

### Final worker result
`BLOCKED`

Final feature SHA before the status-metadata commit:
`942409474db8db191ee5e49452c0da1baeeb482a`.
