# 0109 - Normalize Apollo query lifecycles and fetch policies

- [ ] DONE
- [ ] BLOCKED

## Objective

Make every Angular GraphQL read explicitly choose a one-shot or watched lifecycle and a justified Apollo fetch policy, eliminating `watchQuery(... network-only)` as the default for requests that do not need a live watcher.

Source: `NG-023` in Series `0001`.

## Context

Multiple GraphQL services use `watchQuery(..., fetchPolicy: 'network-only').valueChanges` even for reads that behave as one-shot requests. This retains watchers unnecessarily and bypasses cache value. Earlier tasks centralize generated GraphQL documents/types, feature facades, pagination composition and typed invalidation. This task defines consistent query lifecycle/fetch semantics before task `0110` establishes cache merge/update policy.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/`
- generated GraphQL client/documents introduced by SYS/NG tasks
- feature facades introduced by `0091`-`0099`
- pagination composition from `0102`
- Apollo configuration in `src/app/app.config.ts`

## In scope

- Inventory every production GraphQL read and classify it as one-shot, actively watched/reactive, or paginated/incremental.
- Replace one-shot `watchQuery` uses with the appropriate one-shot Apollo API/lifecycle.
- Retain watchers only where updates/refetch/subscription semantics genuinely require one and give them deterministic lifecycle ownership.
- Define an explicit fetch-policy decision table for canonical use cases (`cache-first`, `cache-and-network`, `network-only`, `no-cache`, or supported equivalents).
- Eliminate anonymous/global refetch ticks in favor of typed query invalidation/refetch commands established earlier.
- Add static/test coverage preventing accidental reintroduction of unjustified `network-only` watched reads.

## Out of scope

- Do not implement pagination field merge/type policies owned by `0110`.
- Do not change server GraphQL semantics.
- Do not globally force one fetch policy for every domain.
- Do not trade stale-data correctness for fewer requests without documenting the domain invariant.

## Decisions already made

- A request that only needs one response must not maintain an Apollo watcher.
- `network-only` is permitted only when a documented freshness invariant requires it; it is not the default.
- Active watchers have an explicit component/facade/session owner and teardown.
- Fetch policy is part of the feature query contract and therefore testable.

## Requirements

1. Produce an inventory/classification of production queries and migrate all one-shot reads.
2. Document the fetch-policy matrix and rationale in code/config documentation near the client layer.
3. Ensure watched reads terminate with their feature/lifecycle owner.
4. Ensure mutations/domain events invalidate/refetch typed query identities rather than global numeric ticks.
5. Add tests for representative cache-hit/cache-refresh/network-error behavior.
6. Add a deterministic source gate or lint/test rule that flags `watchQuery` + `network-only` unless explicitly allowlisted with a machine-readable rationale.
7. Register that gate in `ci:check`.

## Acceptance criteria

- [ ] One-shot reads do not use `watchQuery`.
- [ ] Every retained watcher has a justified reactive use case and deterministic teardown.
- [ ] Every production query has an explicit documented fetch policy or inherits a deliberate canonical default.
- [ ] No refetch depends on anonymous global ticks.
- [ ] An unjustified `watchQuery(... network-only)` fixture fails the CI gate.
- [ ] Existing freshness/correctness behavior is covered by tests.

## Validation

Run GraphQL service/facade tests, the new query-policy gate and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise dashboard, search, molecule detail, collections and Help/ticket flows while inspecting GraphQL network requests. Verify navigation/revisit/cache behavior, mutation-driven refresh and absence of duplicate long-lived reads.

## Stop conditions

Mark `BLOCKED` if a query's freshness requirement cannot be inferred from existing behavior/tests and choosing a cache policy would change product semantics.

## Dependencies

- GraphQL generation/document cleanup SYS tasks must be `DONE`.
- Relevant feature-facade and pagination tasks through `0102` should be `DONE`.

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
