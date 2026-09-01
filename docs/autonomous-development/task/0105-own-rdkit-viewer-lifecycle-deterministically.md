# 0105 - Own MoleculeViewer RDKit lifecycle deterministically

- [ ] DONE
- [ ] BLOCKED

## Objective

Make `MoleculeViewerComponent` acquire, use and release the RDKit capability with deterministic component-scoped ownership, leaving no live subscription, scheduled render or vendor resource after destroy.

Source: `NG-019` in Series `0001`.

## Context

`MoleculeViewerComponent` currently subscribes directly to `RDKitService.instance$` in `initRdkit()` without storing or terminating the subscription, keeps a vendor `RDKitModule` reference, schedules rendering through `requestIdleCallback`/`setTimeout`, and creates/deletes RDKit molecule objects during rendering. Task `0104` introduces the lazy application-facing chemistry adapter; this task completes viewer-specific lifetime ownership rather than reintroducing direct SDK coupling.

## Relevant files and modules

- `MercurionWebNg/src/app/components/chem/molecule-viewer/molecule-viewer.component.ts`
- chemistry renderer/adapter introduced by `0104`
- `MercurionWebNg/src/app/services/rd-kit.service.ts` if still present after `0104`
- molecule-viewer specs and chemistry adapter tests

## In scope

- Consume only the application-facing renderer/chemistry contract created by `0104`.
- Tie readiness/subscriptions/async work to `DestroyRef`, `takeUntilDestroyed`, signals/effects with automatic cleanup, or an equivalent explicit owner.
- Cancel/ignore pending idle callbacks, timers and stale renders when input changes or the component is destroyed.
- Guarantee every per-render RDKit molecule/resource is disposed exactly once, including exception paths.
- Prevent stale render results from an older structure/theme request from overwriting the newest state.
- Add repeated mount/unmount and rapid-input-change tests that prove zero retained work/resources.

## Out of scope

- Do not change chemistry algorithms, palette semantics or molecule structure formats.
- Do not import `@rdkit/rdkit` from the component after `0104`.
- Do not eagerly initialize RDKit globally.
- Do not modify `../MercurionTox21`.

## Decisions already made

- The component lifecycle is the owner of viewer work.
- Vendor objects never outlive the render operation that created them unless the adapter explicitly owns them.
- Latest requested render wins; destroyed components cannot publish results.
- Cleanup must not depend on garbage collection.

## Requirements

1. Remove unmanaged `instance$.subscribe(...)` ownership from the viewer.
2. Use the `0104` adapter contract for lazy readiness/rendering/disposal.
3. Represent pending render work with a cancellable token/handle or generation id.
4. Dispose molecule/vendor resources in `finally`-equivalent paths.
5. Ensure theme/input changes coalesce or supersede stale work instead of accumulating renders.
6. Add tests for destroy-before-ready, destroy-during-render, rapid structure changes, theme changes and repeated mount/unmount.

## Acceptance criteria

- [ ] `MoleculeViewerComponent` retains no unmanaged RxJS subscription after destroy.
- [ ] The component imports no RDKit vendor type/API directly.
- [ ] Pending timers/idle callbacks/stale async renders cannot update a destroyed or superseded viewer.
- [ ] Per-render vendor resources are deterministically released on success and failure.
- [ ] Repeated mount/unmount tests detect no retained observers/work.
- [ ] Existing preview/detail rendering remains compatible.

## Validation

Run molecule-viewer and chemistry-adapter tests, then the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, repeatedly enter/leave molecule-list/detail routes, rapidly change rendered molecules where possible, switch theme while viewers are visible, and verify no duplicate renders, stale SVGs, console errors or progressive slowdown.

## Stop conditions

Mark `BLOCKED` if the vendor adapter from `0104` cannot provide deterministic cancellation/disposal without changing chemistry semantics or if CI cannot be restored to green.

## Dependencies

- `0104-encapsulate-ketcher-and-rdkit-behind-lazy-adapters.md` must be `DONE`.
- Lifecycle conventions introduced by `FE-027`/`FE-028` apply.

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
