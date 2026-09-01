# 0047 - Replace anonymous refetch ticks with typed domain invalidation

- [ ] DONE
- [ ] BLOCKED

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