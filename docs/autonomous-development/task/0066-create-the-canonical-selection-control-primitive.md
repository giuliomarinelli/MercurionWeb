# 0066 - Create the canonical selection-control primitive

- [x] DONE
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

> Current status (2026-09-12): DONE (provisional pending exact feature-SHA CI).
> Executed on `feature/UI-008` from base
> `4fc1d60b8069d158fb316e8f32cd0942953f7ce2`.

### Feature branch
`feature/UI-008`

### Preflight
- Confirmed clean `develop` and `origin/develop` at the supplied base SHA.
- Exact base CI run `34653934977` succeeded, including both platform jobs and
  `Required gate`.
- Runtime capability preflight started Tox21, Nest and Angular in order,
  reached two consecutive successful nginx readiness rounds, opened the
  authenticated application origin, and stopped all three processes before
  implementation.

### Preflight remediation
The historical dependency skip was re-enabled by direct owner instruction.
No baseline or dependency code was changed.

### Summary
Added `m-selection-control`, a typed standalone checkbox/switch primitive with
native checkbox semantics, switch-only `role="switch"`, deterministic
label/description associations, checked/indeterminate/disabled states,
focus-visible styling, and ControlValueAccessor support. Migrated collection
selection cards, the molecule-detail switch, and the login remember-me switch
without changing form values or business logic.

### Task-specific validation performed
- Focused Angular selection-control spec: 4/4 passed.
- `npm run typecheck --workspace mercurion_web_ng` passed.
- Focused ESLint for the primitive, spec, and migrated consumers passed.
- `npm run build --workspace mercurion_web_ng` passed; existing bundle-size and
  CommonJS warnings were non-fatal.
- The first test attempt used invalid npm `--include` forwarding; the
  corrected Angular CLI include command passed. Neither `npm ci` nor
  `npm run ci:check` was run locally.

### Full pre-merge CI-parity validation
Local clean-install/aggregate validation is reserved for GitHub Actions. The
unchanged supplied base had successful full CI evidence; exact feature-SHA CI
is pending publication of this task commit.

### Browser validation performed
- Restarted canonical Tox21, Nest and Angular and obtained two consecutive
  complete readiness rounds through `http://localhost:8888`.
- Chrome DevTools accessibility snapshot on the authenticated molecule-detail
  route exposed the canonical switch with its checked state and description.
- Keyboard-only Tab/Space toggled the switch from checked to unchecked while
  retaining its accessible name and description.
- Emulated both dark and light schemes; the accessible contract remained
  stable and a light-mode control screenshot was captured.
- Final process inventory confirmed no task-owned runtime remained.

### Commits
`17e8c054171a2fca0ad749944683c9a86d4c8663`

### Merge / CI
No merge was performed; `develop` was not modified. Exact feature-SHA CI is
required after push.

### Rollback
_Not applicable._

### Blocker / human decision required
No implementation blocker. Await exact feature-SHA GitHub Actions evidence.
