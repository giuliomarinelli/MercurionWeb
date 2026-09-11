# 0062 - Create the canonical TextField primitive

- [x] DONE
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
`feature/UI-004`, starting from supplied base
`de6a2daef4de389589a43d99790827623033aea2`.

### Preflight
- Confirmed a clean `feature/UI-004` worktree and exact local HEAD/base SHA.
- Confirmed exact base GitHub Actions CI run `34641541355` for
  `de6a2daef4de389589a43d99790827623033aea2`: Ubuntu quality, Windows
  quality, classify validation and `Required gate` all succeeded.
- Confirmed no task-owned Angular, Nest, Tox21 or workspace watcher was active
  before runtime startup.
- Focused unchanged-baseline check:
  `npm run test:ci --workspace mercurion_web_ng -- --include=src/app/components/common/floating-input/floating-input.component.spec.ts`
  completed successfully; npm emitted its existing `include` configuration
  warning.

### Implementation
- Added standalone `TextFieldComponent` (`m-text-field`) with a stable
  generated/consumer-supplied ID, label association, hint/error
  `aria-describedby`, invalid/required/disabled state, caller-owned CVA
  reactive-form propagation, preserved input semantics, and projected
  `mTextFieldPrefix`/`mTextFieldSuffix` slots.
- Replaced `FloatingInputComponent` with a compatibility re-export of the
  canonical primitive and migrated auth, recovery, profile-registry and
  sensitive-data action consumers to `m-text-field`.
- Removed consumer visual-class passthrough inputs and obsolete floating-input
  CSS. Existing validation/business rules remain in caller forms.
- Added focused accessibility, invalid-state, disabled-state, form
  propagation and prefix/suffix tests.

### Task-specific validation
- `npx ng test --watch=false --karma-config=karma.conf.js --include=src/app/components/common/text-field/text-field.component.spec.ts`
  passed: 4 specs.
- `npm run typecheck --workspace mercurion_web_ng` passed.
- Focused ESLint over the TextField and migrated consumers passed with no
  errors; only three pre-existing warnings remained in migrated files.
- `npm run build --workspace mercurion_web_ng` passed. Existing bundle-budget
  and CommonJS warnings remained; no build error occurred.
- The repository-wide Angular lint command was observed to contain one
  unchanged-baseline error outside the focused TextField diagnostics; it was
  not modified or charged to this task.
- `git diff --check` passed.

### Browser validation performed
Using the dedicated Chrome DevTools MCP profile and only
`http://localhost:8888`:
- Pre-implementation capability preflight started Tox21, Nest and Angular in
  the required order, retained all three live execution handles, observed two
  consecutive complete `/health` + `/` readiness rounds, then performed a
  fresh ordinary login with the shared local test account through
  `fill_form`; protected dashboard state was observed.
- Post-implementation validation repeated the required startup order and two
  complete readiness rounds. A fresh ordinary login reached the protected
  dashboard.
- Login fields exposed associated labels, required semantics and keyboard
  navigation; clicking the label focused the email control and Tab moved to
  password.
- Register page exposed the migrated name, surname, email, job, password and
  confirmation fields with consistent labels/required semantics.
- Settings personal-details action opened the migrated profile text fields;
  the modal exposed caller-owned validation fields and keyboard traversal.
- The focused component tests supplied direct evidence for invalid/error
  association, disabled state, reactive value propagation and prefix/suffix
  content projection.
- All task-owned runtime sessions were stopped after evidence capture and
  process inventory showed no remaining Tox21/Nest/Angular task process.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are forbidden in
autonomous workers. Exact feature-SHA clean-install and aggregate CI evidence
is owned by GitHub Actions after the feature commit is pushed.

### Commits
The implementation/status commit is recorded in branch history after this
note update; the final SHA is returned to the coordinator.

### Merge / CI
No merge or protected-branch operation was performed. The coordinator must
observe the exact pushed feature-SHA `Required gate` before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None. `DONE` is provisional pending exact feature-SHA CI.
