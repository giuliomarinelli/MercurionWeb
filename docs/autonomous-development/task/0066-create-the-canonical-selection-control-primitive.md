# 0066 - Create the canonical selection-control primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one canonical accessible selection-control family for checkbox, toggle and switch semantics, with consistent label, description, checked/indeterminate/disabled states and keyboard/focus behaviour.

Source: `UI-008` in Series `0001`.

## Context

Checkboxes, toggles and switch-like controls currently use local markup, colours and state presentation. The audit identified this as a design-system and accessibility drift problem: visually similar controls do not share one semantic or state contract.

## Relevant files and modules

- Angular templates containing checkbox/toggle/switch controls
- settings and filter components
- form controls/models driving boolean/multi-selection state
- canonical field design tokens from earlier UI tasks

## In scope

- Define canonical checkbox/switch/toggle APIs with explicit semantics.
- Support label, optional description, checked, indeterminate and disabled state.
- Integrate with Angular forms/signals without duplicating state ownership.
- Normalize focus-visible, hover and dark/light styling.
- Migrate existing compatible controls.
- Add accessibility/keyboard/form tests.

## Out of scope

- Multi-option custom select/listbox (`0064`).
- Tabs/disclosures (`0075`).
- Changing business meaning of existing boolean settings.

## Decisions already made

- Checkbox and switch are different semantic modes even if they share visual/token infrastructure.
- Native input semantics should be preserved where practical rather than recreated with generic elements.
- Label activation must work consistently.
- Indeterminate is supported only where the domain actually has a third aggregate state.
- Feature components own values; the primitive reflects/emits them.

## Requirements

1. Inventory current checkbox/toggle/switch patterns and classify the intended semantic role of each.
2. Implement a typed canonical control API with native form/accessibility semantics.
3. Wire labels/descriptions deterministically and expose correct role/state in the accessibility tree.
4. Support checked, indeterminate and disabled states where applicable.
5. Migrate existing controls without changing stored values or business logic.
6. Remove duplicated control markup/styles after migration.
7. Add tests for mouse/keyboard activation, label click, disabled and indeterminate states.

## Acceptance criteria

- [ ] Checkbox/switch/toggle controls use a canonical primitive/family.
- [ ] Semantic role matches the actual interaction, not merely visual appearance.
- [ ] Label/description/state are accessible.
- [ ] Focus and disabled treatment are consistent across themes.
- [ ] Business values remain compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused selection-control tests and representative settings/filter form tests, then canonical CI-parity validation.

## Browser validation

Using Chrome DevTools MCP at `http://localhost:8888`, inspect representative checkbox and switch/toggle controls with keyboard only and in the accessibility tree; verify label activation, checked/disabled/indeterminate state and light/dark appearance.

## Stop conditions

Mark `BLOCKED` if an existing switch-like control has ambiguous product semantics (instant command versus persisted boolean choice) and the correct accessible role cannot be determined from repository behaviour.

## Dependencies

- `0062-create-the-canonical-textfield-primitive.md`

## Implementation notes

Share visual tokens/controllers where useful, but do not erase the semantic distinction between checkbox and switch.

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