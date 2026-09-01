# 0063 - Create the canonical Textarea primitive

- [ ] DONE
- [ ] BLOCKED

## Objective

Introduce one canonical accessible textarea field with typed resize policy, optional character limit/count and consistent hint/error/disabled presentation, then remove duplicated textarea structure and counter logic from feature components.

Source: `UI-005` in Series `0001`.

## Context

Textarea controls and character counters are currently assembled locally in feature templates with divergent structure, spacing and error handling. This task builds on the common field semantics introduced by `0062` while keeping text-area-specific behaviour explicit.

## Relevant files and modules

- feature templates containing `<textarea>`
- action/help/feedback components using multiline text
- canonical field semantics from `0062`
- shared form validators and styles

## In scope

- Add a canonical textarea primitive compatible with Angular forms.
- Support label, hint, error, required, disabled and optional character count/limit.
- Define typed resize policy.
- Migrate application textarea usages.
- Remove feature-local counter/error/layout duplication.
- Add component/accessibility tests.

## Out of scope

- Rich-text/code editors.
- Product-specific content validation/copy.
- Search or select controls.

## Decisions already made

- Character counting is presentation derived from the current value; validation ownership remains with the form.
- The primitive does not silently truncate input unless an explicit native/configured limit requires it.
- Resize behaviour is a finite semantic option, not arbitrary CSS injection.
- Field accessibility semantics should reuse the canonical field contract from `0062` where practical.

## Requirements

1. Inventory all textarea/counter implementations and classify legitimate behavioural differences.
2. Implement a canonical textarea with deterministic label/described-by/error wiring.
3. Support typed resize modes and optional max-length/count display.
4. Make count output accessible without creating noisy live-region announcements for every keystroke.
5. Migrate all ordinary application textareas.
6. Remove obsolete feature-local counter/error wrappers.
7. Add tests for form propagation, max-length/count, disabled/invalid states and resize configuration.

## Acceptance criteria

- [ ] Ordinary application textareas use the canonical primitive.
- [ ] Label/hint/error/required/disabled semantics match canonical fields.
- [ ] Character limits/counts are consistent and testable.
- [ ] Resize policy is typed.
- [ ] No duplicated textarea counter markup remains for migrated controls.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused textarea/form tests, search for remaining ordinary raw textarea patterns, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, verify representative multiline forms at desktop/mobile widths: focus, typing, counter, invalid state, resize policy and light/dark appearance.

## Stop conditions

Mark `BLOCKED` if a textarea is actually a domain-specific editor requiring behaviours not captured by the audit's normal textarea pattern. Do not force specialized editors into this primitive.

## Dependencies

- `0062-create-the-canonical-textfield-primitive.md`

## Implementation notes

If a reusable field-shell was introduced in `0062`, use it rather than reimplementing label/error wiring.

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