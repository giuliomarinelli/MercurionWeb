# 0050 - Own browser listeners, timers and animation frames deterministically

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/FE-028`, created from `develop` at base SHA `bd2bc657e92584ae6611c2b3dd95493c6daa1e7c`. No other branch was touched.

### Preflight
Confirmed no session/task-owned Angular, Nest, Tox21 or test-watcher process was running, then ran root `npm ci` followed by `npm run ci:check` (Angular lint/typecheck, Nest lint/typecheck, all Angular Karma tests, all Nest Jest unit + E2E tests, Angular production build, Nest build, GraphQL/contract/application-error/environment-boundary policy checks) before making any change. The unchanged baseline was green.

### Preflight remediation
None. Baseline was green before implementation began.

### Summary
Audited every production Angular DOM listener/timer/`requestAnimationFrame` usage under `MercurionWebNg/src/app` and gave each an explicit owner with deterministic cancellation:

- Added a shared `BrowserResourceOwner` utility (`utils/browser-resource-owner.util.ts`) providing owner-tracked `setTimeout`/`setInterval`/`requestAnimationFrame`/`addEventListener`, a bounded `waitForCondition()` helper for DOM-target polling, and `injectBrowserResourceOwner()` (auto-disposes via `DestroyRef`). Fully unit tested (9 tests).
- `AppContextService.smoothTo`: replaced an unbounded recursive RAF retry with a bounded/cancellable wait.
- `AbstractPaginationComponent` (+ `AllMyMoleculesPageComponent`, `MyMoleculeCollectionsPageComponent`, `MoleculeCollectionDetailPageComponent`): owned/cancellable RAF and `IntersectionObserver` cleanup via a new `disposePaginationResources()` base method (deliberately not named `ngOnDestroy` to avoid Angular NG2007 flagging the undecorated abstract base class as using an Angular lifecycle-hook name). Four sibling subclasses (`add-molecules-to-collection`, `bind-collections-to-molecule`, `ticket-detail`, `help.page`) required no functional change beyond confirming their own `ngOnDestroy`/observer-teardown remained correct once the base class stopped declaring a same-named method.
- `CollapseMaxHeightDirective`: RAF ownership via `BrowserResourceOwner`; `ResizeObserver`/transitionend listener disposed on destroy; idempotent listener detachment before each re-attach.
- `ToastService`: fixed a stale-timer race by tracking and clearing all three internal timeout ids (`slideIn`/`autoDismiss`/`hide`) at the start of both `trigger()` and `close()`.
- `FeedbackPageComponent`: fixed a dropped `setTimeout` return value and a `clearInterval`/`clearTimeout` mismatch; timer is now tracked and cleared in `ngOnDestroy` and on repeat submit.
- `HeaderComponent`: three independent menu-close timers (theme/avatar/avatar-mobile) are now tracked and cleared before each reschedule and on destroy.
- `SidenavContextService`: moved transition timing out of `effect()` (which does not run synchronously after a signal `set()`) directly into `open()`/`close()`/`toggle()`, using a tracked timeout id + generation counter, matching the existing `search-context.service.ts` pattern.
- `HistoryComponent`: tracked the delete/fade-out timeout, clearing/resetting it on repeat trigger and on destroy.
- `KetcherFrameComponent`: fixed duplicate `MutationObserver`/`focusin` registration on iframe remount by adding an idempotent `teardownMobileKeyboardGuard()` called both before every install and from `ngOnDestroy`; tracked the untracked 50ms load-guard timer.
- `MoleculeViewerComponent`: added `OnDestroy`; idle-callback/timeout render scheduling is now tracked and cancelled before each reschedule and on destroy, with a `destroyed` guard on the deferred job callback.
- `SearchOverlayComponent`: added `OnDestroy` disconnecting the `IntersectionObserver` and unsubscribing the chembl/my-molecules search subscriptions (previously no `OnDestroy` at all -- confirmed real leak).
- `PasswordRecoveryPageComponent`: tracked the 3000ms post-error redirect timer, clearing/resetting it on repeat submit and clearing it in `ngOnDestroy`.
- `TermsAndPoliciesPageComponent`: replaced the second unbounded `requestAnimationFrame` retry (`applyFragment` waiting for header height) with `BrowserResourceOwner.waitForCondition()` (bounded) and tracked the subsequent layout-settle RAF + 20ms timeout.

Scope boundary: RxJS subscription lifecycle is task `0049`'s domain and was left untouched except where a fix required tracking a subscription that shares a field with a timer/RAF being fixed (e.g. `SearchOverlayComponent`). Socket.IO listener ownership (task `0040`) and the theme-listener architecture (task `0056`) were not touched.

### Task-specific validation performed
Added/extended Jasmine (Karma) fake-timer, mocked-RAF/idle-callback and destroy-lifecycle tests for every file above. Ran the full combined targeted suite for all touched spec files together: **62 of 62 tests passed**. Representative assertions: stale timers/RAF/idle-callbacks are cancelled and never fire after destroy; a second trigger resets rather than stacks a pending timer; duplicate `MutationObserver`/listener registration cannot occur on remount; bounded RAF/idle-callback polling never schedules past its `maxAttempts`/its owner's disposal.

Also fixed two pre-existing specs that began failing only because they instantiated Angular classes outside an injection context (`new X()` / bare `TestBed`-less construction) once those classes gained an `inject()`-based field (`AbstractPaginationComponent`, `CollapseMaxHeightDirective`); both were converted to `TestBed`-based host-component instantiation, which is the correct/only way to construct a class that calls `inject()`.

### Full pre-merge CI-parity validation
Ran root `npm ci` followed by `npm run ci:check` twice from a clean, runtime-process-free workspace: once immediately after implementation (caught and fixed an NG2007 Angular build error caused by naming the new base-class cleanup method `ngOnDestroy` on an undecorated abstract class -- renamed to `disposePaginationResources()`), and once more, final, immediately before integration after browser-validation processes were stopped. Both the Angular Karma suite (242/242) and the Nest Jest unit + E2E suites (187/187 + 1/1) passed; Angular lint/typecheck, Nest lint/typecheck, Angular production build, Nest build and every GraphQL/application-error/environment-boundary/mock-ip/nested-subscription policy check passed with no errors.

### Browser validation performed
Started the canonical local runtime per `RUNTIME.md` (Nest `start:dev`, Angular `start:dev`, MercurionTox21 `python -m main`) to validate through `http://localhost:8888`. The Nest backend failed to start in this environment: `MercurionWebNode` has no `.env` file, and `ConfigModule` validation fails on missing OAuth secrets (`GITHUB_CLIENT_ID`, `LINKEDIN_CLIENT_ID`, `DISCORD_CLIENT_ID`, etc.) that are required application configuration, not something this task is authorized to invent. This is a pre-existing local-environment limitation unrelated to FE-028's code changes, so `http://localhost:8888` could not serve a working backend and full interactive browser validation (mount/unmount overlays, smooth-scroll, console/network inspection) could not be exercised. All three runtime processes were stopped again immediately after this was confirmed, and a final clean `npm ci` + `npm run ci:check` (see above) proved no leftover watcher interfered with the workspace.

Per this task's explicit validation guidance ("Browser validation is mandatory if safe routes/resource behavior can be exercised; otherwise document the concrete limitation and use automated lifecycle validation"), automated lifecycle validation was used instead: every fix has a dedicated fake-timer/mocked-RAF/mocked-idle-callback/mocked-DOM-observer Jasmine test that deterministically simulates destroy/remount/repeat-trigger races without depending on the live application shell, and the full combined suite (62 tests across all touched files) plus the complete CI-parity Karma run (242 tests) passed.

### Commits
One coherent commit on `feature/FE-028` containing the full audit + fixes + tests described above (SHA recorded after commit, below).

### Merge / CI
Not started (coordinator-owned integration step; out of scope for this worker invocation).

### Rollback
Not applicable.

### Blocker / human decision required
None for `DONE`. Note for awareness (non-blocking): the local `MercurionWebNode` OAuth environment configuration (`.env`) is absent in this environment, which prevents live browser validation of any Nest-backed route until a human provisions local OAuth secrets or a mock configuration -- this is pre-existing and outside this task's scope.
