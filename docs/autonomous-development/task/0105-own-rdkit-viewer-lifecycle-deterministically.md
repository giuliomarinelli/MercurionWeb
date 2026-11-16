# 0105 - Own MoleculeViewer RDKit lifecycle deterministically

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-019`, based at `0d99ceee8ab3703cd532a480ac4a639c8318e099`.

### Preflight
Proved no Angular, Nest, Tox21, Karma/Jest watcher or other workspace-consuming
process was active, then ran the unchanged root baseline:

- `npm ci` - passed; 1,925 packages installed, RDKit patch applied, 0 vulnerabilities.
- `npm run ci:check` - passed; Angular 276/276, Nest unit 187/187, Nest E2E
  1/1, builds, GraphQL/generated-artifact checks and all registered static
  policies were green.

### Preflight remediation
_None._

### Summary
- Bound viewer teardown to `DestroyRef`, centralized idempotent session
  disposal and invalidated all initialization/render generations on disable or
  destroy.
- Added latest-request-wins render generations for structure, mode and theme
  changes, with cancellation of pending idle callbacks/timeouts and guards
  against stale success/error publication.
- Ensured temporary off-screen SVG measurement nodes are removed in a
  `finally` path.
- Hardened the RDKit adapter so molecules are deleted exactly once when vendor
  validation returns false or throws, in addition to existing success and
  operation-failure cleanup.
- Added destroy-before-ready, destroy-during-render, rapid structure/theme
  supersession, disable and repeated mount/unmount coverage.

### Task-specific validation performed
- `npx ng test --watch=false --karma-config=karma.conf.js
  --include='src/app/components/chem/molecule-viewer/molecule-viewer.component.spec.ts'
  --include='src/app/chemistry/adapters/rdkit-renderer.adapter.spec.ts'
  --include='src/app/chemistry/chemistry-renderer.service.spec.ts'` - 18/18 passed.
- `npm run typecheck --workspace mercurion_web_ng` - passed.
- `npm run lint --workspace mercurion_web_ng` - passed with the repository's
  existing warning baseline and zero errors.

### Full pre-merge CI-parity validation
After stopping every task-owned runtime and proving ports 3498/8099 and all
workspace-consuming process probes were clear:

- Final `npm ci` - passed; 1,925 packages installed, RDKit patch applied,
  0 vulnerabilities.
- Final `npm run ci:check` - passed; Angular 284/284, Nest unit 187/187, Nest
  E2E 1/1, Angular/Nest builds, chemistry lazy-boundary validation,
  GraphQL/generated-artifact checks and every registered static policy were
  green.

### Browser validation performed
Chrome DevTools MCP validation used only `http://localhost:8888` with the
task-scoped Angular, Nest and read-only Tox21 runtimes. The existing local
development environment file was preloaded for Nest, and Tox21 was started
with UTF-8 console mode after its first Windows cp1252 launch attempt rejected
the status glyph.

- `/health` returned 200 and `/molecules/detail/1` rendered `Lead 1` with one
  ready molecule SVG.
- Rapid in-app route changes through molecule IDs 2, 3, 4 and 5 settled on
  `Lead 5`; the final page had two ready SVG viewers (detail plus similar
  molecule) and no unavailable state.
- Navigated away to `/welcome` and back to `/molecules/detail/36269`;
  `TIAZURIL` rendered successfully after remount.
- Switched the live viewer from dark to light theme; it remained one ready SVG
  with no render alert or stale replacement.
- The final page loaded RDKit JavaScript and WASM once each. Console inspection
  found no errors or warnings from chemistry/viewer lifecycle work (one
  unrelated image-dimension browser issue was reported).
- All task-owned runtime process trees were stopped before the final clean
  install.

### Commits
- `89a66a25` - `fix(chemistry): own molecule viewer lifecycle`
- Execution-note/final-status commit recorded in the worker result.

### Merge / CI
Ready for coordinator feature-SHA CI and integration. No merge performed by
the worker.

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
