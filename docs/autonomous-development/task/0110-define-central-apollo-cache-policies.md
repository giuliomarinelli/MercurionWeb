# 0110 - Define central Apollo cache and mutation-update policies

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace the bare `new InMemoryCache()` configuration with tested central Apollo entity, pagination, invalidation and mutation-update policies so cache behavior is deterministic across Angular features.

Source: `NG-024` in Series `0001`.

## Context

Apollo is currently initialized with an unconfigured `InMemoryCache()`. Pagination, entity identity, mutation refresh and invalidation are therefore handled ad hoc by callers or network refetches. Task `0109` defines read lifecycle/fetch-policy semantics; this task provides the central cache contract those reads and mutations can rely on.

## Relevant files and modules

- `MercurionWebNg/src/app/app.config.ts`
- central Apollo/client configuration created by earlier GraphQL refactors
- generated schema/types/documents
- collection/molecule/help/notebook GraphQL domains that remain in product
- canonical pagination model from `UI-016` / `0102`

## In scope

- Define explicit entity identity/key policies for cacheable GraphQL entities.
- Define field policies for paginated/cursor/list fields that need deterministic merge/reset behavior.
- Centralize mutation cache-update/invalidation strategies by domain.
- Prevent duplicates/stale pages after create/update/delete/move/bind operations.
- Define when eviction/refetch is preferable to an in-place update.
- Add isolated cache tests using representative query/mutation payloads.

## Out of scope

- Do not cache data whose authorization/freshness semantics forbid it merely to reduce requests.
- Do not use broad `resetStore()`/global cache clearing as the normal mutation-update strategy.
- Do not invent backend entity identifiers when the schema does not expose a stable identity.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Cache identity and pagination behavior live in central Apollo configuration, not scattered components.
- Pagination merge is keyed by the query/filter identity and must reset when that identity changes.
- Mutation completion leaves every affected visible query in a coherent state without anonymous global ticks.
- Auth/session transitions may clear user-owned cache according to the canonical session lifecycle.

## Requirements

1. Inventory cacheable entity types and define stable `keyFields`/equivalent policy.
2. Define tested pagination/list field policies for relevant queries, including filter/search variable separation and duplicate prevention.
3. Define per-mutation update/evict/refetch rules for create/update/delete and relationship changes.
4. Integrate cache clearing/partitioning with login/logout/session-owner changes so one account cannot observe another account's cached data.
5. Add tests for page merge, reset on variable change, mutation update, delete/evict, optimistic path if used, and session transition.
6. Keep policy code typed against generated GraphQL types where supported.

## Acceptance criteria

- [ ] `InMemoryCache` has explicit tested type/field policies for cacheable domains.
- [ ] Pagination merges do not duplicate or cross-contaminate different filter/query identities.
- [ ] Mutations deterministically update, evict or refetch affected cache entries.
- [ ] User-owned cached data cannot survive into a different authenticated user session.
- [ ] Cache behavior is covered by isolated tests rather than inferred only from browser behavior.
- [ ] Components contain no ad-hoc cache surgery that belongs in central policy.

## Validation

Run Apollo cache-policy tests, domain GraphQL tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise list pagination, create/update/delete/bind actions and route revisit behavior while inspecting GraphQL traffic and UI state. Verify no duplicates/stale entries and correct state after logout/login where test accounts permit.

## Stop conditions

Mark `BLOCKED` if a domain lacks stable entity identity or its intended freshness/authorization policy is unresolved and a cache policy would risk serving incorrect data.

## Dependencies

- `0109-normalize-apollo-query-lifecycles-and-fetch-policies.md` must be `DONE`.
- Canonical session ownership and pagination tasks must be `DONE`.

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
