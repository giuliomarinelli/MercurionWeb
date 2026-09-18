# 0110 - Define central Apollo cache and mutation-update policies

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-024`, based on `23deb9f6befe9aef5ee4010c481c98c1d959cedb`.
### Preflight
Passed unchanged against the supplied base. Exact current `develop` merge run
`35276442690` succeeded with Required gate and predecessor NG-023 run
`35275686381` succeeded. Local signing is disabled. No local `npm ci` or
`npm run ci:check` was run.

The non-navigating Chrome DevTools capability probe passed. Task-owned Tox21,
Nest, and Angular were started in the mandated order for both pre- and
post-implementation probes. Nest and Angular reached two consecutive HTTP 200
readiness rounds through `http://localhost:8888`; Tox21 remained alive and
connected to Nest through NATS. The persistent profile redirected `/login` to
the authenticated dashboard and exposed protected account data. A fresh
UI logout/login attempt was not possible because the account-menu interaction
timed out twice; this was recorded as a browser-tool diagnostic, not a task
failure.
### Preflight remediation
None.
### Summary
Replaced the bare Apollo `InMemoryCache` with a central typed policy module.
Stable GraphQL entities now have explicit schema-backed identities; search and
value objects intentionally remain embedded. Paginated collection, molecule,
and ticket fields use filter-scoped key arguments, reset on first-page identity
changes, merge later pages, and deduplicate normalized entities. Mutation field
policies invalidate affected list/detail roots and evict deleted entities
without global `resetStore()` calls. Authentication transitions synchronously
evict user-owned query roots so cached data cannot cross session ownership
boundaries.
### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_ng`
- `npm run lint:angular --workspace mercurion_web_ng -- --no-warn-ignored`
- `npx ng test --watch=false --include=src/app/services/graphql/apollo-cache-policies.spec.ts`
  (12 passed)
- `npx ng test --watch=false --include=src/app/services/auth-state.store.spec.ts
  --browsers=ChromeHeadless` (24 passed; reproduces and fixes feature CI run
  `35279946669`, Angular unit tests job `105399617`)
- `git diff --check`

The full Angular test invocation also observed 483 passed and 18 pre-existing
auth/session contract failures unrelated to this task.

### CI repair attempt 2
The exact feature-SHA failure was isolated to `AuthStateStore.clearApolloUserCache`:
Apollo Angular's root-provided `Apollo` shell exists in isolated tests, but its
`client` is uninitialized, so reading `apollo.client.cache` failed before the
optional chaining guard could run. The repair exposes the initialized central
cache through the optional `MERCURION_APOLLO_CACHE` application token and makes
`AuthStateStore` depend on that token. Production `provideApollo` supplies the
token; isolated auth tests omit it and therefore skip cache clearing safely.

The full Angular suite after the repair reported 500 passed and one unrelated
pre-existing accessibility contrast failure in
`src/app/testing/accessibility-canonical-ui.spec.ts:178`.
Repair commit: `d95929137b5f9b8919f38385691712631c031b0d`.

### CI repair attempt 3
Exact feature run `35281616145` / Angular unit-test job `105406005716`
reported 501 passing tests but the `auth-state-store-baseline-exception`
branch gate at 71.875%, below the approved 73% QA-012 floor. Added focused
coverage for the task's optional `MERCURION_APOLLO_CACHE` injection path by
providing a cache spy and verifying user-owned root eviction during
authentication start. The existing tests continue to cover the absent-token
path; no coverage threshold was changed.

Focused validation passed:

- `npx ng test --watch=false --include=src/app/services/auth-state.store.spec.ts --browsers=ChromeHeadless` (25 passed)
- `npx ng test --watch=false --include=src/app/services/graphql/apollo-cache-policies.spec.ts --browsers=ChromeHeadless` (12 passed)
- `npx ng test --watch=false --include=src/app/services/auth-state.store.spec.ts --browsers=ChromeHeadless --code-coverage` (25 passed)
- `npm run typecheck --workspace mercurion_web_ng`
- `npm run lint:angular --workspace mercurion_web_ng -- --no-warn-ignored`
- `git diff --check`

Repair commit: `2bab49fd9c58f5fc1ed89e97211aaca1f374a8d3`.

### Full pre-merge CI-parity validation
The final pushed feature SHA `9eb9f34dcd66763f7dfd0d80be03366dfbd664d6`
was not mergeable after the configured three repair attempts. Exact feature
run `35282799357` passed both platform prerequisite jobs, GraphQL gates,
containers, Nest tests/E2E and browser journeys, but the Angular unit job
`105409445464` failed its approved coverage gate:
`auth-state-store-baseline-exception` branch coverage was `72.65625%`, below
the required `73%` QA-012 floor. The full clean-install aggregate remains
owned by GitHub Actions and was not run locally.
### Browser validation performed
Through `http://localhost:8888`, post-implementation dashboard and collection
detail routes rendered with protected account state. GraphQL inspection
observed successful 200 responses for collection detail,
`PaginatedMoleculeCollectionItemsByCollection`, and the existing
`MarkMoleculeCollectionAsTouched` mutation. Route revisit rendered the
collection state without console errors. No destructive create/delete action
was issued because the browser interaction surface timed out during the
required fresh-login attempt; mutation invalidation behavior is covered by the
isolated cache suite.

All task-owned runtime processes were stopped after validation and verified
absent; the externally managed nginx edge was left running.
### Commits
`c127a14f` (`feat(angular): define central Apollo cache policies`),
`d9592913`, `18d603c5`, and `9eb9f34d` (bounded CI repairs and coverage
correction). The final feature SHA is preserved and frozen at
`9eb9f34dcd66763f7dfd0d80be03366dfbd664d6`.
### Merge / CI
Not merged. Exact feature-SHA CI remained unsuccessful after the configured
three repair attempts; preserve the feature branch for human diagnosis.
### Rollback
_Not applicable._
### Blocker / human decision required
The repository-controlled Angular coverage gate remains below its approved
QA-012 branch floor by `0.34375` percentage points after the repair budget was
exhausted. Human-authorized follow-up is required before integration; do not
weaken the threshold or merge the branch without restoring the gate.
