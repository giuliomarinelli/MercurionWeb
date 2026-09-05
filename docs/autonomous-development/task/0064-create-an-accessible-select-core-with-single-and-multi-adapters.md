# 0064 - Create an accessible Select core with single and multi adapters

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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

### Feature branch
No task branch or worker was created because hard prerequisite
`0062-create-the-canonical-textfield-primitive.md` (`UI-004`) is
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. `UI-004` is terminal
`SKIPPED_DEPENDENCY`, with transitive blocked root cause
`0052-standardize-modern-angular-component-apis.md` (`FE-030`).

### Task-specific validation performed
No implementation or validation was performed.

### Full pre-merge CI-parity validation
Not applicable; no feature branch was created.

### Browser validation performed
Not applicable; the task was skipped before implementation.

### Commits
Only this task metadata was updated on `develop`.

### Merge / CI
No feature merge; skip metadata CI is required before continuing.

### Rollback
_Not applicable._

### Blocker / human decision required
No implementation blocker. Re-enable only after the dependency chain through
FE-030 is deliberately resolved in a new authorized session.