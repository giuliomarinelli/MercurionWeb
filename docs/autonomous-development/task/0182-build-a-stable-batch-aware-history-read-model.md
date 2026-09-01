# 0182 - Build a stable batch-aware History read model

- [ ] DONE
- [ ] BLOCKED

## Objective

Turn History reads into an explicit paginated projection with stable ordering and batch enrichment so queries/presenters load only required columns and never perform per-row external/entity lookups.

Source: `DATA-033` in Series `0001`.

## Context

`HistoryService.getPaginatedHistoryWithManager()` already selects the latest row per `(itemEntity,itemId)` and batches collection/item database names, but then resolves each ChEMBL molecule with `moleculeService.getDetailByMolregno()` inside `Promise.all`, creating external lookup growth with page size. The service also mixes persistence query construction, enrichment and DTO mapping. `getRecentHistoryTinyDistinctPerDay()` follows a separate projection path with different distinct/order logic.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/history/services/history.service.ts`
- History entity/DTOs/enums
- molecule collection/item read repositories
- ChEMBL/Meilisearch molecule read adapter
- profile read model from `0174`
- canonical pagination from BE-029/`0143`

## In scope

- Define one History query/read-model boundary with explicit projection DTOs.
- Preserve latest-per-resource semantics with stable deterministic ordering/tie-breakers.
- Select only columns required for the requested History projection.
- Batch local resource-name resolution by entity type.
- Batch ChEMBL name resolution in one bounded provider call per page where possible.
- Separate query rows, enrichment and presentation mapping.
- Reuse a manager-aware tiny/recent projection for profile without leaving the transaction snapshot.
- Add query/provider-call count tests as page size grows.

## Out of scope

- Do not make History a write-side event store.
- Do not redesign the user-facing meaning of history recency/distinctness without evidence from existing UI/tests.
- Do not use eager entity relations simply to simplify mapping.

## Decisions already made

- History is a read model/projection.
- Pagination order must have a stable tie-breaker (`touchedAt` plus immutable ID or equivalent).
- Enrichment cost is batch-bounded, not one database/provider request per row.

## Requirements

1. Document current semantics of paginated History and recent-per-day profile History before changing implementation.
2. Extract query projection types independent of TypeORM entities.
3. Keep the latest-per-resource query owner-scoped and deterministic for equal timestamps.
4. Resolve collection/custom-molecule names with set-wise SQL queries.
5. Resolve all ChEMBL molregnos for the page using an existing/new batch read method; never call a remote/provider service once per row.
6. Make missing/deleted resources produce a documented projection outcome rather than silently causing unstable pagination metadata.
7. Expose a manager-aware recent-history method reused by `0174` so one profile snapshot is maintained.
8. Add query-count/provider-call-count, deleted-resource and pagination stability tests.

## Acceptance criteria

- [ ] History reads return projection DTOs, not mutated persistence entities.
- [ ] SQL/provider call counts are bounded independently of page size.
- [ ] Ordering/pagination is deterministic under equal timestamps.
- [ ] Profile recent History can run on the caller's transaction manager.
- [ ] Missing/deleted referenced resources follow a documented tested policy.

## Validation

Run History unit/integration tests, page stability tests under concurrent inserts, SQL/provider-call instrumentation tests, profile integration tests, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate History/dashboard/profile surfaces through `http://localhost:8888`, including pagination and mixed custom/ChEMBL entries if available.

## Stop conditions

Mark `BLOCKED` if the current UI intentionally depends on dropping missing-resource rows in a way that makes pagination metadata inconsistent and the desired product behavior is not documented.

## Dependencies

- `0174-build-a-consistent-profile-read-model.md` should be `DONE` or coordinated so both share the manager-aware recent projection.
- canonical pagination and molecule batch-read contracts should be available.

## Implementation notes

Avoid solving the N provider calls with an unbounded process cache. A batch API keyed by the current page's molregnos preserves bounded freshness and ownership of the read model.

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