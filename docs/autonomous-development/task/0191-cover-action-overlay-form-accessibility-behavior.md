# 0191 - Cover action-overlay, form and accessibility behavior

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Add behavior and accessibility tests for the canonical Angular action/overlay/form primitives so open/close, confirm/cancel, loading/error state, focus ownership, keyboard interaction and ARIA semantics are protected as contracts rather than inferred from visual markup.

Source: `QA-005` in Series `0001`.

## Context

The UI/FE tasks consolidate ActionCard, ActionFooter, overlays, fields, selects and action-session state. These primitives are reused across many workflows, so a regression in focus restoration, disabled/loading behavior or keyboard handling affects the whole application. Earlier UI tasks establish semantic controls and axe/accessibility infrastructure; this task turns those semantics into repeatable behavioral tests.

## Relevant files and modules

- canonical ActionCard/ActionFooter/action-overlay primitives
- action state machine/session from `0045` and `0058`
- TextField/Textarea/Select/SearchField/selection primitives from UI tasks
- Dialog/Overlay primitives
- Angular component-test utilities
- accessibility/axe infrastructure introduced by UI-026

## In scope

- Test action overlay open, close, confirm and cancel transitions.
- Test loading/disabled/error states and duplicate-submit protection.
- Test focus acquisition/restoration and expected focus trap behavior for modal surfaces.
- Test keyboard behavior including Escape, Enter/Space and Tab according to each semantic control.
- Assert accessible names, roles, state attributes and validation/error associations.
- Test form primitive disabled/invalid/required/read-only states where supported.
- Run automated accessibility assertions on representative states without replacing keyboard/behavior tests.

## Out of scope

- Do not snapshot large DOM/class trees as the primary contract.
- Do not assert private implementation state when an accessible/public effect is observable.
- Do not create a second set of UI primitives solely for testing.
- Do not duplicate full browser journeys owned by `0195`.

## Decisions already made

- Native/semantic button and link behavior is preferred over custom key simulation.
- Modal focus ownership and restoration are explicit contracts.
- Loading/disabled states must prevent duplicate destructive/confirm actions.
- Automated axe checks complement but do not replace keyboard/focus assertions.

## Requirements

1. Build reusable component-test helpers for opening overlays and querying by semantic role/name rather than fragile CSS internals.
2. Cover open→confirm success, open→cancel and error/retry flows for the action shell.
3. Cover attempted double-confirm while loading and verify exactly one command is emitted.
4. Verify focus moves to the intended initial target and returns to the opener after close where applicable.
5. Verify Escape/Tab/Enter/Space behavior matches the semantic component contract and does not trigger disabled actions.
6. Verify validation messages are associated with controls through accessible semantics.
7. Run axe/accessibility assertions for representative normal/error/disabled/modal states using the existing UI accessibility infrastructure.
8. Ensure tests work under light/dark theme without depending on color/class snapshots.

## Acceptance criteria

- [ ] Action open/confirm/cancel/error/loading behavior is covered.
- [ ] Duplicate submission while pending is prevented and tested.
- [ ] Modal focus lifecycle and keyboard behavior are tested deterministically.
- [ ] Canonical form controls expose correct roles/names/state/error associations in tests.
- [ ] Representative states pass automated accessibility assertions.

## Validation

Run focused UI/action specs, accessibility checks, complete Angular tests, lint/template lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not required by this component-test task, but `0195` must validate representative action/focus behavior through the real browser at `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if a primitive's intended keyboard/focus behavior is ambiguous after the corresponding UI task, because accessibility tests must encode an explicit approved interaction contract.

## Dependencies

- Relevant UI tasks `0059`–`0086` must be `DONE`.
- Action state/session tasks `0045` and `0058` should be `DONE`.
- `0187` must provide a green Angular test runner.

## Implementation notes

Prefer role/name queries and user-visible interaction to raw `querySelector` against implementation classes. A CSS refactor should not break a behavioral accessibility test when semantics are unchanged.

## Execution notes

> Current status (2026-09-18): READY. The authoritative planner resolves all
> hard prerequisites as DONE; the historical dependency skip was stale and was
> replaced before implementation.

- 2026-09-18: Replaced stale `SKIPPED_DEPENDENCY` history after
  `npm run autonomous:plan --silent` classified 0191 (`QA-005`) as READY.

### Feature branch
`feature/QA-005`
### Preflight
- Base SHA `d81ae228797a53b4ecf7ca7e73de1b0dc9ee21c3` was clean and matched the
  assigned feature branch.
- Exact-SHA Actions run `35293843125` completed successfully with `Required gate`
  green.
- Focused baseline: existing action, dialog, form, select and accessibility
  specs; 43 tests passed.
- Browser validation was not required by this component-test task.
### Preflight remediation
_None._
### Summary
Added reusable semantic-role test querying and a dedicated action overlay/form
accessibility fixture covering modal focus ownership/restoration, Escape and
semantic action behavior, loading/disabled duplicate-submit protection, form
validation associations, and representative axe states. Extended the canonical
button and accessibility specs with loading/disabled and modal/error coverage.
### Task-specific validation performed
- `ng test --watch=false` with the action context, action overlay, action card,
  action footer, button, dialog shell, text field, textarea, select,
  canonical accessibility and new action overlay/form accessibility specs:
  50 tests passed.
- `eslint` on all changed Angular test/helper files: passed.
- `tsc --noEmit -p tsconfig.app.json`: passed.
- `git diff --check`: passed.
- Initial feature CI run `35296355339` on commit
  `7fe3d70bab6e072c233d68b0462c82f3ff34920f` failed only at the repository
  topology gate because the test helper used a non-`.spec.ts` filename and was
  classified as an Angular orphan.
- CI repair renamed the helper to `component-test-helpers.spec.ts`; focused
  validation passed again (28 tests, lint, typecheck and diff check).
### Full pre-merge CI-parity validation
- Exact feature-SHA run `35296355339` for `7fe3d70bab6e072c233d68b0462c82f3ff34920f`
  failed at `angular-reachability` because the test helper was not named as a
  spec-only file.
- Repair commit `3a4b7aa597f5c09cc4352f35a2472bf7f5828513` passed exact feature
  CI run `35296784272`; all workflow jobs and `Required gate` succeeded.
### Browser validation performed
Not required by task; component tests use ChromeHeadless and axe-core.
### Commits
- `7fe3d70bab6e072c233d68b0462c82f3ff34920f` — initial implementation.
- `3a4b7aa597f5c09cc4352f35a2472bf7f5828513` — CI repair.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
None.

### Dependency skip

Historical skip text replaced because the authoritative planner reports 0191
as READY with no terminal dependency roots.
