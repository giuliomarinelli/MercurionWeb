# 0065 - Create the canonical SearchField primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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
No task branch or worker was created because hard prerequisites
`0060-create-the-accessible-iconbutton-primitive.md` (`UI-002`) and
`0062-create-the-canonical-textfield-primitive.md` (`UI-004`) are
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. `UI-002` and `UI-004`
are terminal `SKIPPED_DEPENDENCY`, with transitive blocked root cause
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