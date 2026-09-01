# 0065 - Create the canonical SearchField primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one stateless `SearchField` primitive with typed value/output, clear action, pending state and accessible labelling, while keeping debounce/request policy in the calling facade or feature.

Source: `UI-007` in Series `0001`.

## Context

Search input, clear controls and debounce behaviour are reconstructed in multiple places. The repository already contains `pm-search-input` and search-overlay input components, while feature pages also compose their own search controls. The primitive should unify the UI contract without hiding asynchronous query policy inside a reusable component.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/pm-search-input/`
- `MercurionWebNg/src/app/components/search-overlay/search-input/`
- search/filter inputs in pages and action components
- canonical TextField/IconButton from `0062`/`0060`
- feature/facade RxJS pipelines that currently own debounce

## In scope

- Add a canonical stateless search-field UI primitive.
- Support value, change/search output, clear, pending/disabled state and accessible label/hint.
- Preserve composition with reactive forms/signals as appropriate.
- Move debounce/network timing out of reusable UI components into callers/facades.
- Migrate duplicated search-field markup and remove superseded components where possible.
- Add interaction/accessibility tests.

## Out of scope

- Search result rendering.
- Remote query semantics, cache policy or GraphQL/REST request design.
- Generic select/combobox filtering (`0064`).

## Decisions already made

- The field is stateless with respect to request timing; it must not own `debounceTime` or network subscriptions.
- Clear is an accessible icon-button action and emits the resulting empty value deterministically.
- Pending state communicates work without making the field unusable unless the caller explicitly disables it.
- Search label remains accessible even when visually hidden.

## Requirements

1. Inventory current search-input components and page-local patterns.
2. Define a typed value/change/submit API that does not duplicate state internally.
3. Compose canonical field and icon-button primitives where practical.
4. Support clear visibility/action, pending indicator and disabled state consistently.
5. Move component-local debounce to the caller/facade, preserving existing timing where it is intentional.
6. Migrate compatible search controls and remove superseded wrappers.
7. Add tests proving immediate UI output, deterministic clear, pending state and accessible name.
8. Add representative facade tests proving debounce remains outside the UI primitive.

## Acceptance criteria

- [ ] Compatible application search fields use one canonical primitive.
- [ ] The primitive contains no debounce/network policy.
- [ ] Clear and pending behaviour are consistent and accessible.
- [ ] Search value has one owner and no hidden duplicate internal state.
- [ ] Existing search flows preserve their intended query timing.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run SearchField tests plus focused tests for migrated caller debounce pipelines, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, exercise the global search and at least one page/action search: keyboard focus, typing, clear action, pending state, result timing, mobile/desktop and light/dark appearance.

## Stop conditions

Mark `BLOCKED` if two existing controls have materially different semantics (for example free-text search versus select/autocomplete) that cannot truthfully share the same primitive. Do not force a combobox into SearchField.

## Dependencies

- `0060-create-the-accessible-iconbutton-primitive.md`
- `0062-create-the-canonical-textfield-primitive.md`

## Implementation notes

A caller may debounce a signal/RxJS output; the canonical field should emit user intent promptly and predictably.

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