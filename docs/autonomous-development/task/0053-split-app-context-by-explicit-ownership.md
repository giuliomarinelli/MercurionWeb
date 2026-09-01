# 0053 - Split AppContextService by explicit ownership

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove `AppContextService` as a generic global container by assigning scroll-host state, shell/layout state and domain refresh/events to separate focused owners with minimal APIs.

Source: `FE-031` in Series `0001`.

## Context

`AppContextService` currently owns unrelated concerns: generic added ticks, scroll ticks, global scroll-root references, dashboard refetch ticks, header height, off-canvas close triggers and smooth-scroll implementation. Earlier tasks remove anonymous refetch ticks and thin the root component; this task completes the ownership split instead of leaving a smaller but still generic global context.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/app-context.service.ts`
- `MercurionWebNg/src/app/app.component.ts`
- consumers of `globalScollRootRef`, `headerHeight`, scroll/refetch/off-canvas ticks
- domain invalidation infrastructure from `0047`
- shell/navigation facade from `0043`
- UI components using global smooth-scroll/root state

## In scope

- Inventory every remaining `AppContextService` signal/method and its consumers.
- Move scroll root, scroll helpers and viewport/scroll coordination to a dedicated scroll owner.
- Move shell-specific dimensions/off-canvas state to a shell/layout owner if still required.
- Route domain refresh/change signals through the typed invalidation mechanism from `0047`.
- Remove obsolete generic ticks and `AppContextService` once no mixed ownership remains.
- Add focused tests for each replacement service.

## Out of scope

- Full viewport/overlay design-system work.
- Reworking action overlay state.
- Route manifest work.
- General application event bus.

## Decisions already made

- Scroll infrastructure, domain refresh and shell state have separate owners.
- No replacement service may become a generic dumping ground named “global/app context”.
- Domain changes use semantic events/invalidation, not numeric ticks.
- DOM `ElementRef` ownership remains as close as possible to the shell/view that creates the element.

## Requirements

1. Produce a consumer map for every property/method of `AppContextService` at execution time.
2. Remove fields already made obsolete by prior tasks rather than relocating them.
3. Create narrowly scoped scroll/root service or directive/facade for scroll host registration and smooth-scroll operations.
4. Move header/shell geometry/off-canvas coordination only to a shell-specific owner where still necessary.
5. Ensure no domain data refresh depends on the scroll/shell services.
6. Refactor all consumers and remove `AppContextService` when empty; a temporary compatibility adapter may exist only within the task and must not be the final state.
7. Add tests proving owners can be used independently without constructing unrelated global state.

## Acceptance criteria

- [ ] `AppContextService` no longer exists as a heterogeneous global container.
- [ ] Scroll host/helpers have a dedicated owner.
- [ ] Shell/layout state has a dedicated owner or remains local to the shell.
- [ ] Domain refresh uses typed invalidation from `0047`.
- [ ] No generic added/refetch tick survives in replacement services.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused replacement-service tests, repository search for `AppContextService`/removed tick APIs, then the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, verify shell scrolling/smooth-to-top, header/sidenav behaviour, route transitions and one domain refresh flow still work without cross-coupling or console errors.

## Stop conditions

Mark `BLOCKED` if a remaining field's ownership cannot be established and moving it would create another generic service. Record the consumers and required ownership decision.

## Dependencies

- `0043-reduce-appcomponent-to-a-thin-application-shell.md`
- `0047-replace-anonymous-refetch-ticks-with-typed-domain-invalidation.md`
- `0050-own-browser-listeners-timers-and-animation-frames-deterministically.md`

## Implementation notes

Deleting a god service is preferable to renaming it. Focused owners should expose semantic APIs and keep DOM/runtime dependencies out of unrelated domain state.

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