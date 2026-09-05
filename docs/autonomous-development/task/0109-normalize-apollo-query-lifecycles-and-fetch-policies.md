# 0109 - Normalize Apollo query lifecycles and fetch policies

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-023`, created from and initially verified at
`fdfc8e83f841d4b99bc0b0a9c16d4533f80bf7ce`.
### Preflight
Before task changes, no task/session-owned Angular, Nest, Tox21, test watcher,
or workspace runtime was active. With Node.js `v22.16.0` and npm `10.9.2`,
root `npm ci` completed successfully (1925 packages, 0 vulnerabilities) and
root `npm run ci:check` completed successfully with exit status 0.
### Preflight remediation
_None._
### Summary
Preserved coherent partial implementation in commit `2250b236`:

- migrated all 29 production GraphQL reads from retained `watchQuery`
  observables to one-shot `Apollo.query` observables;
- centralized explicit `cache-first`, `network-only`, `no-cache`, and
  `cache-and-network` decisions and configured deliberate Apollo defaults;
- documented the complete production query inventory, lifecycle
  classification, fetch policy, and freshness rationale;
- added representative cache-first, network-refresh, and network-error tests;
- added and registered a deterministic source gate that rejects missing
  one-shot fetch policies and undocumented watched queries, including an
  unjustified `watchQuery` plus `network-only` negative fixture.

No anonymous/global GraphQL refetch tick exists in production source; existing
mutation-driven refreshes request typed generated query documents through the
one-shot service methods.
### Task-specific validation performed
- `npm run ci:angular:graphql-query-policy` - passed, including negative
  fixtures.
- `npm run typecheck --workspace mercurion_web_ng` - passed.
- `npm run lint --workspace mercurion_web_ng` - passed with the baseline
  warning set and no errors.
- `npx ng test --watch=false --karma-config=karma.conf.js
  --include='src/app/services/graphql/molecule.service.spec.ts'
  --include='src/app/services/graphql/molecule-search.service.spec.ts'
  --include='src/app/services/graphql/notebook.service.spec.ts'` from
  `MercurionWebNg` - 13 tests passed.
- `git diff --check` - passed before the implementation commit.
### Full pre-merge CI-parity validation
After stopping every task-owned runtime and proving ports 3498/8099 had no
listener, root `npm ci` completed successfully (exit 0; two non-fatal Windows
cleanup warnings followed by a successful install), then root
`npm run ci:check` completed successfully with exit status 0.
### Browser validation performed
Blocked. The nginx edge served Angular through `http://localhost:8888/`
(HTTP 200), and Chrome DevTools MCP loaded the welcome page then navigated
`/dashboard`, which correctly redirected to
`/login?redirect_to=%2Fdashboard`. The canonical Nest process could not start:
`npm run start:dev` compiled with zero TypeScript errors, then environment
validation rejected the absent local runtime configuration (including
`APP_PORT`, database, JWT, cookie, Redis, NATS, OAuth, mail and related required
values). Consequently `http://localhost:8888/health` returned 502 and the
required authenticated dashboard, search, molecule detail, collections and
Help/ticket GraphQL network evidence could not be captured. No test credentials
were supplied to the isolated MCP browser context.

Tox21 initially hit a Windows console encoding error, then remained healthy
when restarted with `PYTHONUTF8=1`. Angular compiled and served on the configured
nginx upstream. Tox21, Nest and Angular processes started by this task were all
stopped before the final clean install.
### Commits
- `2250b236` - `refactor(angular): normalize Apollo query lifecycles`
- Blocker metadata commit: recorded by the following branch commit.
### Merge / CI
Not eligible for integration because mandatory browser validation could not be
completed. No merge or remote CI polling was performed by the worker.
### Rollback
_Not applicable._
### Blocker / human decision required
Provide the approved local Nest runtime environment configuration and
non-production test account/session needed to exercise the authenticated
dashboard, search, molecule detail, collections and Help/ticket flows through
`http://localhost:8888`. Then a newly authorized task attempt must repeat the
canonical runtime/browser evidence. The worker did not invent or copy secrets
and did not weaken the mandatory browser gate.
