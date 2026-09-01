# 0048 - Eliminate nested subscriptions and declare async concurrency policy

- [ ] DONE
- [ ] BLOCKED

## Objective

Refactor Angular async pipelines so state-dependent requests use an explicit concurrency policy (`switchMap`/latest-wins, `concatMap`/ordered, `exhaustMap`/single-flight or another justified equivalent) and production code contains no unmanaged nested subscriptions.

Source: `FE-026` in Series `0001`.

## Context

The audit found effects/subscriptions that trigger additional asynchronous work and can produce overlapping requests without cancellation. The codebase also contains many direct `valueChanges.subscribe(...)`, Apollo `valueChanges` streams and action flows. The problem is not subscription syntax itself: it is implicit concurrency and nested ownership that allows stale responses to win.

## Relevant files and modules

- Angular production `.ts` files containing `.subscribe(` / `effect(` with asynchronous side effects
- auth/session flows
- action components under `components/action-components/`
- GraphQL/Apollo services and pages
- search/molecule/detail/dashboard request pipelines
- RxJS helper/utilities and tests

## In scope

- Inventory nested subscriptions and effects that initiate cancellable/serializable async work.
- Classify each pipeline's intended concurrency semantics.
- Refactor nested request subscriptions into composed RxJS/signal async pipelines or explicit command controllers.
- Cancel stale latest-wins work and serialize/single-flight operations where required.
- Add race/concurrency tests with deliberately reordered responses.
- Add a static/review gate for newly introduced nested subscriptions where feasible.

## Out of scope

- Removing all `.subscribe()` calls regardless of ownership.
- Component subscription teardown as a separate concern; task `0049` owns lifecycle binding.
- Rewriting the app into a different reactive framework.
- Changing product semantics to fit a preferred RxJS operator.

## Decisions already made

- Concurrency semantics are explicit per pipeline.
- A stale async result may not overwrite state produced by a newer intent in a latest-wins flow.
- Submit-like commands that must not overlap use single-flight or serialized semantics rather than duplicate requests.
- Nested `subscribe()` is not used to model request dependency/concurrency.

## Requirements

1. Search production Angular code for nested `.subscribe()` and effects callbacks that launch Observables/Promises/HTTP/GraphQL work.
2. For each affected flow, determine from existing UX/tests whether it is latest-wins, ordered, exhaust/single-flight or independently concurrent.
3. Refactor dependent requests through appropriate flattening/composition and keep errors/cancellation observable.
4. Ensure late responses from cancelled/superseded work cannot mutate signals/forms/navigation.
5. Preserve explicit side-effect boundaries where a final subscription is appropriate.
6. Add tests that reorder response completion and assert the chosen policy.
7. Document/allowlist rare intentional independent concurrency rather than hiding it.

## Acceptance criteria

- [ ] No production request pipeline uses nested subscriptions to express dependency/concurrency.
- [ ] Every refactored state-driven pipeline has an explicit tested concurrency policy.
- [ ] Latest-wins flows ignore/cancel stale work.
- [ ] Single-flight/serialized commands cannot issue unintended duplicate mutations.
- [ ] Errors/cancellation do not leave pending UI state stuck.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run targeted race tests with fake/delayed Observables or HTTP/Apollo test controllers, then the canonical CI-parity gate. Repository search/static checks should identify no unmanaged nested subscription pattern in migrated production scope.

## Browser validation

Through `http://localhost:8888`, exercise at least one search/filter flow rapidly and one submit/action flow repeatedly. Confirm stale results do not replace newer results, duplicate mutations are not sent, pending UI settles correctly and no console errors appear.

## Stop conditions

Mark `BLOCKED` when the correct ordering/concurrency behaviour of a business mutation is ambiguous and choosing latest-wins versus ordered execution could change user-visible data semantics. Record the competing behaviours.

## Dependencies

- `0047-replace-anonymous-refetch-ticks-with-typed-domain-invalidation.md` should be considered where the same flow currently ends in a global refresh tick.

## Implementation notes

Choose operators from semantics, not style. `switchMap` is not a universal replacement: mutations that must complete or preserve order may require `exhaustMap`/`concatMap` or an explicit command queue.

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