# 0062 - Create the canonical TextField primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one canonical accessible text-field primitive that standardizes label, hint, error, required, prefix/suffix and disabled states, then migrate duplicated text-input markup to that contract.

Source: `UI-004` in Series `0001`.

## Context

The audit found 20 static text-input class signatures, 16 of them singletons, with divergent label/error markup. The repository already has `FloatingInputComponent`, but features still construct local form-field patterns and pass visual class customization into reusable controls. A canonical field should own presentation/accessibility while feature forms retain validation/business logic.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/floating-input/floating-input.component.ts`
- auth/register/recovery/settings forms
- action components with text inputs
- shared form validators/models
- canonical Button/IconButton primitives where suffix actions exist

## In scope

- Define a canonical text-field API compatible with Angular forms.
- Standardize visible label, hint, validation error, required and disabled states.
- Support optional prefix/suffix content without feature-local wrapper duplication.
- Ensure deterministic `id`, label association and described-by relationships.
- Migrate existing compatible input patterns, including or replacing `FloatingInputComponent` as appropriate.
- Remove visual-class customization inputs that bypass the design-system contract.
- Add form/accessibility tests.

## Out of scope

- Textarea (`0063`).
- Select/combobox (`0064`).
- Password-specific business policy or validation rules.
- Search-field debounce semantics (`0065`).

## Decisions already made

- Field presentation is canonical; form control ownership and validators remain in the caller.
- Error rendering is based on explicit form/control state, not inferred business rules inside the field.
- Prefix/suffix are presentational slots; suffix actions use accessible controls.
- Consumers do not pass arbitrary Tailwind class strings to create feature-local variants.

## Requirements

1. Inventory text input/floating-input variants and reduce them to a minimal typed field contract.
2. Support reactive forms without introducing a second source of truth for value/validity.
3. Generate or require stable input IDs and wire label, hint and error with correct ARIA relationships.
4. Define visual states for default, focus, invalid, disabled and required in light/dark themes.
5. Migrate representative auth, settings and action-component fields, then all compatible text fields.
6. Preserve input type/autocomplete/inputmode semantics supplied by callers.
7. Remove obsolete duplicated label/error markup and visual-class inputs.
8. Add tests for label association, described-by, invalid/disabled state and form value propagation.

## Acceptance criteria

- [ ] Compatible text inputs use one canonical field primitive.
- [ ] Label/hint/error/required/disabled semantics are consistent and accessible.
- [ ] Reactive form value/validation remains caller-owned.
- [ ] No feature-local class passthrough is required for ordinary field variants.
- [ ] Existing auth/settings/action flows remain behaviourally compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused TextField/form tests and representative migrated page tests, then canonical CI-parity validation.

## Browser validation

Using Chrome DevTools MCP at `http://localhost:8888`, verify representative login/register/settings/action fields: label click/focus, keyboard navigation, invalid message association, disabled state, prefix/suffix and light/dark responsive rendering.

## Stop conditions

Mark `BLOCKED` if an existing input represents a materially different control (combobox/search/special editor) that cannot safely be migrated to a text-field contract. Leave that control to its owning task rather than bloating TextField.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`

## Implementation notes

Prefer a composable field-shell + input contract if that prevents duplicating accessibility wiring across future textarea/select primitives, but do not create a heavyweight form framework.

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