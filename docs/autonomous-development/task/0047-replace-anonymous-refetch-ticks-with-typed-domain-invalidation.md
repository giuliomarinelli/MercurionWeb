# 0047 - Replace anonymous refetch ticks with typed domain invalidation

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace global numeric tick signals used to force refetch/reaction after domain mutations with typed events, commands or query invalidations that identify what changed and carry the minimum useful payload.

Source: `FE-025` in Series `0001`.

## Context

The audited frontend uses counters such as `AppContextService.addedTick`, `refetchDashboardAddedTick` and action-context `addedTick` signals. Producers increment a number and consumers react only to the fact that it changed, losing entity/action identity and making unrelated refreshes easy to couple accidentally. `AddMoleculesToCollectionContextService.notifyAdded()` is one concrete example.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/app-context.service.ts`
- `MercurionWebNg/src/app/services/context/action-context/`
- pages/components consuming `addedTick`, dashboard refetch ticks or equivalent counters
- Apollo/query services affected by mutation-driven refresh
- molecule collection, help/ticket and other action flows that publish global refresh ticks

## In scope

- Inventory anonymous numeric refresh/change ticks and their producers/consumers.
- Define typed domain change events or explicit query/cache invalidation commands with payload.
- Replace each anonymous tick with the narrowest semantic mechanism.
- Prefer Apollo/cache/query invalidation when the actual intent is to refresh a known query/entity.
- Add tests for invalidation targeting and duplicate/unrelated event isolation.
- Register static/architecture checks where practical to prevent new generic global refetch counters.

## Out of scope

- Full application event bus for every UI interaction.
- Apollo cache-policy redesign beyond invalidations needed here; later NG task owns comprehensive cache policy.
- Splitting all remaining `AppContextService` ownership; task `0053` completes that work.
- Action-overlay payload isolation.

## Decisions already made

- Anonymous integer ticks are not a domain contract.
- Mutation effects identify the affected domain/entity/action whenever that information is available.
- Query invalidation is preferred over broad refetch when a specific cache/query can be targeted.
- Events are typed and one-way; consumers do not infer meaning from which number was incremented.

## Requirements

1. Search for counter signals whose only semantic meaning is “something changed/refetch”.
2. For each counter, document producer, consumers and actual domain event/invalidation intent.
3. Replace it with a typed discriminated event or explicit invalidation API carrying IDs/scope where useful.
4. Remove broad dashboard/list refreshes when a narrower cache/query invalidation yields the same correct result.
5. Ensure actions publish the event only after the mutation has actually succeeded.
6. Ensure repeated events are safe/idempotent and unrelated entities do not trigger unnecessary refreshes.
7. Remove obsolete `notifyAdded`, `triggerDashboardRefetch` and equivalent tick APIs when all consumers migrate.
8. Add tests proving payload routing/targeted invalidation.

## Acceptance criteria

- [ ] No production domain refresh relies on an anonymous increment-only tick where a typed event/invalidation is applicable.
- [ ] Consumers know what domain/entity changed from the contract rather than global counter identity.
- [ ] Successful mutations cause only the intended refresh/cache invalidation.
- [ ] Failed/cancelled mutations do not emit success invalidations.
- [ ] Obsolete generic tick APIs are removed.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run targeted action/query/cache tests plus a repository search for removed tick APIs and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, perform at least one available mutation previously using a tick (for example add/create/update in molecule collections or another deterministic action). Verify the affected view updates once, unrelated views do not visibly refetch, and Network does not show a duplicate/global request storm.

## Stop conditions

Mark `BLOCKED` if a tick consumer's intended refresh semantics cannot be determined from code/tests and changing it could leave stale user-visible data. Record producers/consumers and request the ownership decision rather than replacing it with another generic event.

## Dependencies

- None.

## Implementation notes

Do not create a single untyped `AppEventBus<any>` as a renamed tick system. Prefer domain-specific invalidation APIs or a discriminated event union with explicit ownership.

## Execution notes

### Feature branch
`feature/FE-025` (base `8bede88f1dadbf79b3b5549f21467d1e82af9dfb`)

### Preflight
Unchanged branch verified clean at the supplied base SHA. No MercurionWeb
Angular/Nest/Tox21/watch process was active (the observed node processes were
Chrome DevTools MCP watchdogs). `npm ci` passed with the repository's existing
engine/deprecation warnings. `npm run ci:check` passed before implementation.

### Preflight remediation
_None._

### Summary
Replaced anonymous domain refresh counters with
`DomainInvalidationService` and a discriminated `DomainInvalidation` union.
Collection, molecule, dashboard, ticket, and profile consumers now filter
explicit domain/action/payload events. Mutation publishers emit only from
successful responses; collection and molecule invalidations carry the affected
ID. Removed obsolete tick fields and notify/refetch APIs, including orphaned
action-context counters.

### Task-specific validation performed
`npm run typecheck --workspace mercurion_web_ng` passed.
`npm run lint --workspace mercurion_web_ng` passed (pre-existing warnings only).
Angular focused test invocation completed successfully; the configured
`test:ci` runner executed with the supplied include options.
`npm run build --workspace mercurion_web_ng` passed (pre-existing bundle,
CommonJS, and budget warnings).
Repository search confirms no production `addedTick`,
`refetchDashboardAddedTick`, `triggerDashboardRefetch`, or `notifyAdded()` tick
API remains; only no-op test stubs were removed as well.

### Full pre-merge CI-parity validation
With all task-owned processes absent, final `npm ci` passed (npm emitted only
existing engine/deprecation and Windows cleanup warnings), followed
immediately by `npm run ci:check`, which passed.

### Browser validation performed
Not performed: Chrome DevTools MCP reached only unauthenticated login pages
(`http://localhost:8888/login` and `/login?redirect_to=%2Fhelp`). No safe,
deterministic authenticated mutation data or credentials were available, so
the required collection mutation could not be exercised without inventing
user data. Automated typed-routing, success-only emission, typecheck, test,
build, and full CI validation provide the available evidence.

### Commits
`7b8cd67980fccc5262b986e08c5204ea37299485` — implementation, tests, and
execution notes. Pushed to `origin/feature/FE-025`.

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._