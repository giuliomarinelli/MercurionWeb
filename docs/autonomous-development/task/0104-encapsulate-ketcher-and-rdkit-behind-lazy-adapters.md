# 0104 - Encapsulate Ketcher and RDKit behind lazy chemistry adapters

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Hide Ketcher and RDKit vendor APIs behind stable, lazy application adapters with deterministic lifecycle/error boundaries so feature components consume chemistry capabilities without importing or understanding vendor SDK details.

Source: `NG-018` in Series `0001`.

## Context

`KetcherFrameComponent` is imported directly by the molecule editor and owns iframe/vendor interaction. Angular also has `RdKitService` with a direct type dependency on `@rdkit/rdkit`, an RDKit patch/shim and chemistry components such as `MoleculeViewerComponent`. The Series requires editor/renderer chemistry capabilities to become lazy application adapters. Later task `NG-019` specifically addresses RDKit viewer subscription/resource ownership and `NG-025` verifies final bundle budgets; this task establishes the vendor boundary and lazy loading without pre-empting those focused follow-ups.

## Relevant files and modules

- `MercurionWebNg/src/app/components/chem/ketcher-frame/ketcher-frame.component.ts`
- `MercurionWebNg/src/app/components/chem/molecule-viewer/`
- `MercurionWebNg/src/app/pages/molecule-editor/molecule-editor.page.component.ts`
- `MercurionWebNg/src/app/services/rd-kit.service.ts`
- `MercurionWebNg/src/app/services/rd-kit-api.service.ts`
- `MercurionWebNg/src/app/Models/rdkit-api.models.ts`
- `MercurionWebNg/patches/@rdkit+rdkit+2024.3.5-1.0.0.patch`
- RDKit browser shims/configuration

## In scope

- Define stable application-facing chemistry editor and renderer/service contracts independent of Ketcher/RDKit package types.
- Introduce lazy adapters/loaders for Ketcher and RDKit implementation code.
- Move vendor initialization, readiness, timeout/error translation and cleanup behind those adapters.
- Make molecule editor/viewer consumers depend only on application contracts/view models.
- Provide deterministic failure/unavailable states so vendor load/init errors do not crash unrelated UI.
- Add adapter contract tests with vendor implementations/test doubles and lazy-load assertions.

## Out of scope

- Do not change chemical algorithms or backend RDKit API semantics.
- Do not remove the existing RDKit patch/shim unless the new lazy boundary proves it obsolete and tests/builds confirm removal is safe.
- Do not complete the dedicated viewer subscription/resource-lifetime remediation owned by `NG-019` beyond what is strictly necessary for the adapter contract.
- Do not simply raise bundle budgets; `NG-025` owns final performance enforcement.

## Decisions already made

- Feature components must not import `@rdkit/rdkit` or vendor-specific Ketcher APIs/types.
- Vendor code is loaded on demand at the chemistry capability boundary.
- Application-facing results/errors are typed and stable even if vendor versions change.
- Adapter failure is observable/recoverable and isolated from the rest of the page.

## Requirements

1. Define editor/renderer/chemistry-service ports containing only application concepts such as structure input/output, render readiness and typed errors.
2. Load vendor implementation code dynamically only when the relevant editor/viewer/chemistry feature is requested.
3. Prevent duplicate concurrent SDK initialization and make readiness shareable/cancellable as appropriate.
4. Translate vendor errors/exceptions into canonical application errors without leaking raw SDK objects to components.
5. Provide explicit dispose/cleanup hooks used by consuming component lifecycles.
6. Preserve current molecule editing/rendering behavior and structure formats.
7. Add build/chunk assertions proving vendor code is not part of unrelated eager paths.

## Acceptance criteria

- [ ] Feature/page components import no Ketcher/RDKit vendor SDK API/types directly.
- [ ] Ketcher/RDKit implementation loads lazily behind stable application adapters.
- [ ] Initialization/loading errors render a controlled feature state instead of crashing the page.
- [ ] Adapter APIs and error mapping are covered by tests.
- [ ] Existing editor/viewer behavior remains compatible.
- [ ] Production build shows chemistry vendor code isolated from unrelated eager entry chunks where technically supported.

## Validation

Run chemistry adapter/editor/viewer focused tests, production bundle/build checks and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open non-chemistry routes first and verify vendor resources are not unnecessarily loaded; then open molecule detail/editor routes, verify lazy load, render/edit readiness, controlled failure/retry behavior where testable, repeated mount/unmount and no relevant console errors.

## Stop conditions

Mark `BLOCKED` if vendor initialization requires undocumented global state/patch behavior that cannot be encapsulated safely without changing chemistry semantics.

## Dependencies

- SYS RDKit contract task `0015` must be `DONE`.
- Molecule detail facade task `0091` should be `DONE` for clean consumer boundaries.

## Execution notes

### Feature branch
`feature/NG-018`, based at `8d721325c2c2ea21220b70248ace25f34109a95e`.

### Preflight
Proved no Angular, Nest, Tox21, Karma/test watcher or other workspace-consuming process was active. From the unchanged task branch:

- `npm ci` - passed (1,925 packages installed; RDKit patch applied; 0 vulnerabilities).
- `npm run ci:check` - passed with exit status 0.

### Preflight remediation
_None._

### Summary
- Added application-owned editor/renderer contracts, canonical chemistry errors and explicit disposable sessions.
- Replaced direct feature dependencies on `@rdkit/rdkit`, `RDKitService` and Ketcher postMessage details with lazy `ChemistryRendererService` / `ChemistryEditorService` boundaries.
- Added shared, retryable RDKit initialization; serialized Ketcher exports; readiness/operation timeouts; error translation; and controlled retry UI for editor/viewer failures.
- Preserved the RDKit patch and current SMILES, MolBlock, SVG and molecular-property behavior.
- Added a production chunk policy that rejects vendor signatures in the eager main entry and confirms the RDKit/Ketcher adapters are emitted lazily.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` - passed.
- `npm run lint --workspace mercurion_web_ng` - passed with the repository's existing warning baseline and zero errors.
- `npx ng test --watch=false --karma-config=karma.conf.js --include='src/app/chemistry/**/*.spec.ts' --include='src/app/components/chem/**/*.spec.ts'` - 18/18 passed.
- `npm run ci:build:angular` - passed; production build emitted `RDKit_minimal` and `rdkit-renderer-adapter` as lazy chunks, and `chemistry:check-lazy` confirmed the eager `main-MD3CC2AM.js` excludes RDKit/Ketcher adapter signatures.

### Full pre-merge CI-parity validation
After stopping all managed runtimes and proving no workspace-consuming process remained:

- Candidate `npm ci` - passed.
- Candidate `npm run ci:check` - passed with exit status 0.
- The final clean install and complete CI-parity rerun after this execution-note commit are recorded in the worker result.

### Browser validation performed
Chrome DevTools MCP through `http://localhost:8888` with the canonical Angular, Nest and Tox21 runtime:

- `/welcome` loaded first with no RDKit adapter, RDKit WASM or Ketcher asset request and no console errors.
- `/molecules/detail/25` then loaded `rdkit-renderer-adapter`, `@rdkit/rdkit` and `/RDKit_minimal.wasm` on demand; the molecular SVG rendered and repeated welcome/detail mount cycles rendered again without chemistry console errors.
- Forced an invalid viewer structure through the live Angular component: the typed unavailable state rendered, retry recovered to `ready`, and the SVG returned.
- `/molecules/editor?mode=create` was exercised using a browser-only local session-state stub (no credential or backend-data mutation). Ketcher loaded only after route activation; the live application adapter reached `ready`, set `CCO`, exported `CCO`, and remained `ready` after an editor unmount/remount.
- A separate same-origin iframe protocol probe confirmed Ketcher readiness/export and a clean remount. The only editor-route console findings were unrelated history API `429`/`EmptyError` messages caused by the intentionally unauthenticated browser-state stub; there were no Ketcher/RDKit adapter errors.

### Commits
- `16f159b3` - `feat(chemistry): add lazy vendor adapters`
- Execution-note/final-status commit recorded in the worker result.

### Merge / CI
Ready for coordinator feature-SHA CI and integration. No merge performed by the worker.

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
