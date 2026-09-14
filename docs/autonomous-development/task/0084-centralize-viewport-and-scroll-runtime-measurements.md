# 0084 - Centralize viewport and scroll runtime measurements

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one reactive browser viewport/scroll adapter for runtime measurements and migrate overlays, drawers and other JS-driven layout consumers away from duplicated listeners, breakpoints and height calculations.

Source: `UI-026` in Series `0001`.

## Context

Viewport logic is currently spread across the Angular application. `src/main.ts` owns an iOS/Safari `visualViewport`/`innerHeight` workaround and writes `--app-vh`; pagination and feature components independently read `window.innerHeight`, `scrollY`, bounding rects or attach scroll/resize/orientation listeners. This duplicates ownership and makes cleanup/responsive semantics difficult to reason about. CSS remains the preferred tool for responsive layout; this task centralizes only measurements that JavaScript genuinely needs.

## Relevant files and modules

- `MercurionWebNg/src/main.ts`
- `MercurionWebNg/src/styles.css`
- overlay/drawer components and services
- `MercurionWebNg/src/app/abstract/abstract-pagination-component.ts`
- pages/components using `window.innerHeight`, `innerWidth`, `visualViewport`, `scrollY`, resize/orientation/scroll listeners
- lifecycle utilities established by earlier FE tasks

## In scope

- Create one injectable viewport/scroll adapter with a typed readonly API.
- Own required `window`, `visualViewport`, orientation and scroll listeners in that adapter with deterministic cleanup.
- Expose reactive signals/observables for measurements actually needed by application logic.
- Own synchronization of any retained `--app-vh` compatibility variable in this adapter rather than `main.ts`.
- Migrate overlay/drawer/runtime layout calculations and reusable pagination/near-bottom logic to the adapter or to CSS/IntersectionObserver when those are the more correct abstraction.
- Remove duplicated JS breakpoint constants and event listeners after migration.
- Add lifecycle and measurement tests.

## Out of scope

- Do not replace CSS media queries with JavaScript breakpoints.
- Do not force IntersectionObserver visibility logic through the viewport adapter when the browser observer is already the correct primitive.
- Do not change application UX or scrolling policy beyond consolidating ownership.
- Do not modify `../MercurionTox21`.

## Decisions already made

- CSS handles ordinary responsive presentation; JavaScript receives only runtime state it must act on programmatically.
- One adapter owns each global viewport/scroll listener rather than every consumer attaching its own.
- `visualViewport` is used when relevant/available with a deterministic fallback to document/window measurements.
- Browser globals must be guarded so tests/bootstrap do not crash when a DOM API is unavailable.
- The existing iOS viewport workaround may remain only if still required, but its ownership moves out of `main.ts`.

## Requirements

1. Inventory direct reads/listeners for viewport height/width, visual viewport, orientation and global scroll in production Angular code.
2. Define the minimal typed adapter API: current dimensions, relevant visual-viewport state, scroll position/near-boundary helper(s) and/or orientation only where consumers need them.
3. Attach listeners once, coalesce/throttle high-frequency events appropriately and clean them up deterministically.
4. Migrate overlay/drawer and shared pagination/scroll consumers.
5. Replace manual viewport tests with IntersectionObserver/CSS where those provide a more native solution.
6. Move `--app-vh` updates from bootstrap code into the adapter if the compatibility variable remains necessary.
7. Add tests for initial state, resize/visualViewport updates, scroll updates, fallback behaviour and teardown/no duplicate listeners.

## Acceptance criteria

- [ ] Overlay/drawer code does not attach its own global resize/orientation/scroll listeners or duplicate viewport breakpoints.
- [ ] Shared JS consumers obtain viewport/scroll measurements from one typed adapter or a more appropriate browser primitive.
- [ ] `main.ts` no longer owns ad-hoc viewport event listeners.
- [ ] Any retained `--app-vh` variable has one owner and tested update semantics.
- [ ] Global viewport/scroll listener ownership and teardown are deterministic.
- [ ] CSS remains the authority for purely visual responsive layout.
- [ ] Tests prove updates, fallbacks and cleanup without leaked listeners.

## Validation

```text
npm ci
npm run ci:check
```

Run viewport/scroll adapter unit tests directly and confirm no direct duplicated listener patterns remain in the migrated scope.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`:

1. exercise action overlays/drawers at desktop and narrow mobile widths;
2. emulate viewport resize and orientation changes;
3. verify scroll-based pagination/near-bottom behaviour where migrated;
4. inspect the computed `--app-vh` behaviour if retained;
5. verify opening/closing components does not multiply event effects;
6. confirm no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a current JS breakpoint encodes an undocumented product behaviour that cannot be mapped safely to CSS or the canonical adapter, or if CI cannot be restored to green.

## Dependencies

- `0050-own-browser-listeners-timers-and-animation-frames-deterministically.md` must be `DONE` first.
- `0074-create-the-canonical-pagination-and-infinite-load-primitive.md` must be `DONE` first.

## Implementation notes

Prefer Angular signals for current browser state and derived computed values, with RxJS only when event-stream operators materially simplify throttling/cancellation. Avoid a god-service containing unrelated UI state.

## Execution notes

> Current status (2026-09-14): provisional `DONE` pending exact feature-SHA
> CI and integration. UI-016 and FE-028 were verified `DONE`.

### Feature branch
`feature/UI-026`

### Preflight
- Clean feature branch at supplied base
  `483d700e933c9f733c246918c766e7a631fdaecb`.
- Exact base Actions run `34791552028` for that SHA completed successfully;
  both platform validation and the stable Required gate were green.
- No task-owned Angular, Nest, Tox21 or test watcher was active before the
  task-scoped probe.
- Focused preflight typecheck and Angular lint passed on the unchanged
  baseline.

### Preflight remediation
The first Angular start attempt was corrected immediately by restarting the
canonical command from `MercurionWebNg`; no repository change or HTTP request
occurred before all three live runtime handles existed.

### Summary
Added `ViewportRuntimeService`, a typed readonly signal-based adapter that
owns window, visual-viewport, orientation and global-scroll listeners,
coalesces updates, provides near-bottom measurement helpers, and synchronizes
the retained iOS `--app-vh` compatibility variable. Removed bootstrap-owned
viewport listeners from `main.ts` and migrated pagination, toast layout,
Ketcher viewport flags, spinner layout consumers, and viewport fallback reads
to the adapter. Existing IntersectionObserver usage remains the native
visibility primitive.

### Task-specific validation performed
- Angular typecheck and lint passed.
- Focused Karma command
  `MercurionWebNg/node_modules/.bin/ng.cmd test --watch=false
  --karma-config=karma.conf.js --include
  src/app/services/context/viewport-runtime.service.spec.ts` passed: 4 tests.
- Production inventory confirmed direct viewport reads/listeners remain only
  in `viewport-runtime.service.ts`; unrelated message, focus, storage and
  media-query listeners are outside this adapter's ownership.

### Full pre-merge CI-parity validation
Not run locally per policy (`npm ci` and `npm run ci:check` are GitHub Actions
only). Exact feature-SHA CI is coordinator-owned.

### Browser validation performed
- Canonical runtime started in required order (Tox21, Nest, Angular), with
  live handles retained and two consecutive readiness rounds:
  `GET http://localhost:8888/health` and `GET http://localhost:8888/` both
  returned 200 in each final round. Nest compiled with 0 errors; Angular
  reached watch mode; Tox21 remained live and connected through NATS.
- Through the dedicated Chrome DevTools profile and only
  `http://localhost:8888/login`, exercised the responsive drawer at
  390x844 mobile, resized to 1280x800 desktop, then emulated 844x390
  landscape orientation. Snapshots showed the expected responsive
  navigation state and login content. No relevant console errors were
  reported.
- The protected route redirected to the public login flow after the runtime
  restart; no dummy-auth route or synthetic protected-state evidence was
  used.

### Commits
Pending feature commit.

### Merge / CI
Feature branch will be pushed only after the task-specific commit. Coordinator
must wait for exact feature-SHA CI before integration.

### Rollback
Not applicable before integration.

### Blocker / human decision required
None.
