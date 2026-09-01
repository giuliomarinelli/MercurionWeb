# 0050 - Own browser listeners, timers and animation frames deterministically

- [ ] DONE
- [ ] BLOCKED

## Objective

Give every component/service-owned DOM listener, timer and `requestAnimationFrame` loop an explicit lifecycle owner and deterministic cancellation so destroyed/superseded UI cannot continue mutating state.

Source: `FE-028` in Series `0001`.

## Context

The audit found heterogeneous browser-resource ownership. Current examples include mount/unmount timers, window/storage/media listeners, scroll/resize-style resources and `AppContextService.smoothTo()` RAF recursion. Some retry/RAF paths can schedule again when a target is unavailable without an explicit bound/cancellation token.

## Relevant files and modules

- Angular production uses of `addEventListener` / `removeEventListener`
- production uses of `setTimeout`, `setInterval`, `requestAnimationFrame`
- `MercurionWebNg/src/app/services/context/app-context.service.ts`
- UI components with manual DOM/viewport/focus listeners
- loading/search/action contexts after `0045` / `0046`
- theme system listener, coordinated with task `0056`

## In scope

- Inventory browser listeners/timers/RAF handles and assign an owner.
- Add deterministic cancellation on owner destruction and superseding intent.
- Bound retry loops that wait for DOM targets; no unbounded RAF polling.
- Prefer `DestroyRef`, abortable listener registration, explicit timer/RAF handles or equivalent lifecycle primitives.
- Add fake-timer/RAF and destruction tests.
- Prevent duplicate listener registration after remount/re-entry.

## Out of scope

- RxJS subscriptions; task `0049` owns those.
- Socket.IO listener ownership; task `0040` owns it.
- Theme-state architecture itself; task `0056` owns the final theme listener/store.
- Changing animations/UX timing beyond making lifecycle safe.

## Decisions already made

- Every browser resource has one owner and cleanup path.
- Stale callbacks cannot mutate newer/destroyed state.
- DOM-target retry is bounded/cancellable.
- Application-lifetime listeners are acceptable only when ownership is explicit and registration is idempotent.

## Requirements

1. Search production Angular source for listener/timer/RAF creation APIs and record corresponding cleanup/owner.
2. Add teardown for resources lacking deterministic cleanup.
3. Replace recursive RAF retry that can continue indefinitely with a bounded/cancellable wait or event/readiness mechanism.
4. Ensure timers used for UI transitions are cancelled when intent reverses or owner is destroyed.
5. Ensure window/document/media-query listeners are not registered multiple times across remounts.
6. Use lifecycle-aware helpers consistently where the repository supports them.
7. Add tests that destroy/supersede owners and advance fake timers/RAF, asserting no later mutation/callback.
8. Add a lightweight static/review rule or test inventory if practical to flag new unmanaged browser resources.

## Acceptance criteria

- [ ] Every audited DOM listener/timer/RAF resource has explicit ownership and cleanup.
- [ ] No unbounded RAF retry remains waiting for a DOM target.
- [ ] Destroyed/superseded owners receive no later timer/RAF/listener callback.
- [ ] Remount/re-entry does not multiply global listeners.
- [ ] Lifecycle tests are deterministic and use fake scheduling where appropriate.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused fake-timer/RAF/lifecycle tests, repository inventory/search and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, repeatedly navigate/mount/unmount representative overlays/pages and trigger smooth scrolling/viewport-dependent behaviour. Verify no delayed state changes after teardown, no duplicate handlers, no runaway animation loop and no console warnings/errors.

## Stop conditions

Mark `BLOCKED` if a browser resource must intentionally outlive its apparent owner and the correct application-level owner is undocumented. Establish ownership before preserving a global listener by accident.

## Dependencies

- `0046-unify-loading-and-search-transition-control.md`
- `0049-bind-component-streams-to-angular-lifecycle.md`

## Implementation notes

Prefer cancellation tied to lifecycle/generation rather than arbitrary retry-count globals. Any bounded retry should produce a safe terminal result when its target never becomes available.

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