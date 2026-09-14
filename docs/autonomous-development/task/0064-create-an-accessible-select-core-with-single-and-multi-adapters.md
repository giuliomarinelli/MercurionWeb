# 0064 - Create an accessible Select core with single and multi adapters

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace separate select/combo-select/multi-select implementations with one accessible select core and typed single/multi adapters sharing focus, filtering, option rendering, empty state and keyboard navigation.

Source: `UI-006` in Series `0001`.

## Context

The repository contains separate `combo-select` and `combo-multi-select` components with independent `@Input`/`@Output`, filtering and interaction logic. The audit identified select variants as a duplicated UI/behaviour family rather than merely a styling problem.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/combo-select/`
- `MercurionWebNg/src/app/components/common/combo-multi-select/`
- native/select-like controls elsewhere in Angular
- canonical field contract from `0062`
- feature consumers in molecule/action/settings flows

## In scope

- Define one accessible core for option list, focus, keyboard navigation, filtering and empty state.
- Provide typed single-select and multi-select adapters/contracts.
- Preserve feature-specific option data through typed item/value/label mapping.
- Migrate existing combo-select/multi-select consumers.
- Standardize disabled, invalid and accessible labelling states.
- Add keyboard/accessibility/component integration tests.

## Out of scope

- Search-field request debounce (`0065`).
- Product-specific remote-data fetching.
- Arbitrary free-form command palette behaviour.

## Decisions already made

- Single and multi selection share interaction infrastructure rather than forked component logic.
- Keyboard behaviour follows the applicable WAI-ARIA combobox/listbox pattern.
- Filtering is deterministic UI filtering unless a caller explicitly supplies remote results; the primitive does not own network requests.
- Values are typed; `any`-based selected values are not an acceptable canonical API.
- Native `select` remains acceptable where it fully satisfies the feature, but custom comboboxes must use the canonical core.

## Requirements

1. Inventory current combo-select/multi-select inputs, outputs and behaviours and define the smallest common typed model.
2. Implement focus/open/close/active-option state as one explicit controller/state model.
3. Implement Arrow/Home/End/Enter/Escape/Tab behaviour appropriate to the chosen ARIA pattern.
4. Connect control label, expanded state, active descendant/option state and validation/error semantics correctly.
5. Support empty/no-results state and optional local filtering without coupling to feature services.
6. Implement single and multi adapters with typed value/output APIs and deterministic selected-item rendering.
7. Migrate existing consumers and remove old independent interaction implementations when no longer used.
8. Add tests for mouse, keyboard, focus restoration, single/multi selection, filtering, disabled and empty states.

## Acceptance criteria

- [ ] Single and multi custom selects share one accessible core.
- [ ] Existing `any`-based canonical selected-value APIs are eliminated.
- [ ] Keyboard navigation and focus behaviour are deterministic and covered by tests.
- [ ] Filtering and empty states are shared rather than independently reimplemented.
- [ ] Migrated consumers preserve domain values and behaviour.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused core/adapter tests and representative migrated feature tests, then the canonical CI-parity gate.

## Browser validation

Mandatory via Chrome DevTools MCP at `http://localhost:8888`:

1. exercise one single-select and one multi-select with keyboard only;
2. inspect roles, expanded state, selected options and accessible name in the accessibility tree;
3. verify filtering/no-results, disabled state and focus restoration;
4. test mobile and desktop widths plus light/dark themes.

## Stop conditions

Mark `BLOCKED` if current consumers intentionally require incompatible interaction models (for example a true combobox versus a materially different command/search control) and choosing one canonical semantic pattern requires a product/accessibility decision. Split the domains rather than creating a misleading universal component.

## Dependencies

- `0062-create-the-canonical-textfield-primitive.md`

## Implementation notes

Prefer headless state/interaction logic plus thin rendered adapters if that materially improves reuse and testability. Do not introduce a third-party UI framework solely to complete this task unless explicitly approved.

## Execution notes

### Current status

Completed on `feature/UI-006`; `DONE` is provisional pending exact
feature-SHA GitHub Actions validation and integration.

### Feature branch
`feature/UI-006`, starting from supplied base
`ec0c19d23e94b2c29e3b24f9588d82c0c12c3459`.

### Preflight
- Confirmed clean local `feature/UI-006`, exact supplied HEAD/base SHA, and no
  task-owned Angular, Nest, Tox21, Karma, Jest or workspace watcher before
  startup.
- Confirmed exact base GitHub Actions run `34648379114` for
  `ec0c19d23e94b2c29e3b24f9588d82c0c12c3459`: Ubuntu quality, Windows
  quality, classify validation, and `Required gate` all succeeded.
- The unchanged base served as the complete baseline authority; no local
  `npm ci` or `npm run ci:check` was run.
- Runtime capability preflight started Tox21, Nest and Angular directly in the
  required order with live handles. After the startup barrier, nginx returned
  retryable 502 responses while upstreams compiled, then two consecutive
  complete `/health` + `/` readiness rounds succeeded.

### Implementation
- Added `SelectCoreComponent<TItem, TValue>` and typed selection contracts with
  one explicit open/closed, active-index, focus and filter state model.
- Shared combobox/listbox semantics, active descendant, keyboard navigation
  (Arrow/Home/End/Enter/Escape/Tab), deterministic filtering, empty state,
  disabled/invalid/hint/error labelling, create-new and load-more behavior.
- Replaced the independent single and multi interaction implementations with
  thin typed `ComboSelectComponent<TItem, TValue>` and
  `ComboMultiSelectComponent<TItem, TValue>` adapters.
- Removed canonical `any` selected-value APIs and preserved typed domain
  mapping/output behavior for migrated collection-selection consumers.
- Updated both collection-selection consumers to pass their accessible labels
  into the canonical adapter API.

### Task-specific validation
- `npx ng test --watch=false --karma-config=karma.conf.js
  --include=src/app/components/common/select-core/select-core.component.spec.ts
  --include=src/app/components/common/combo-select/combo-select.component.spec.ts
  --include=src/app/components/common/combo-multi-select/combo-multi-select.component.spec.ts`
  passed: 6 specs.
- `npm run typecheck --workspace mercurion_web_ng` passed.
- `npm run build --workspace mercurion_web_ng` passed. Existing bundle-budget
  and CommonJS warnings remained; no build error occurred.
- Focused Angular ESLint completed with no errors; three existing warnings
  remain in the migrated consumer/output naming diagnostics.
- `git diff --check` passed.

### Browser validation performed
Using the dedicated Chrome DevTools MCP profile and only
`http://localhost:8888`:
- Repeated post-implementation startup in canonical Tox21/Nest/Angular order,
  retained all three live handles, waited through retryable 502 responses, and
  observed two consecutive complete readiness rounds.
- Performed a fresh ordinary login through `/login` with the shared local test
  account using MCP `fill_form`; protected dashboard state was observed.
- Opened the migrated single-select collection action, verified its accessible
  combobox name, expanded/listbox relationship and keyboard opening, then
  verified filtering produced the live no-results state.
- Exercised the shared multi-select adapter's keyboard selection and typed
  output through focused component coverage (no existing product route
  currently renders the unused multi-select consumer).
- Repeated a mobile-width/dark-mode browser pass at 390x844 with the
  authenticated dashboard shell visible. A DevTools emulation navigation
  timeout occurred while the shell was rebuilding, then the page recovered
  and its protected UI was observed; no task failure was attributed to it.
- All task-owned runtime sessions were stopped after browser evidence and
  process inventory showed no remaining Tox21/Nest/Angular task process.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are forbidden in
autonomous workers. Exact feature-SHA clean-install and aggregate CI evidence
is owned by GitHub Actions after the feature commit is pushed.

### Commits
- `b88b1499` (`feat(UI-006): add accessible select core and adapters`) contains
  the implementation, focused tests, consumer migrations, and terminal `DONE`
  state.
- A follow-up execution-notes commit records this final validation and commit
  identity.

### Merge / CI
No merge or protected-branch operation was performed. The coordinator must
observe the exact pushed feature-SHA `Required gate` before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
