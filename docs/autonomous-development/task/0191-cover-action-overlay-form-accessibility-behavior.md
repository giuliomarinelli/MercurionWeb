# 0191 - Cover action-overlay, form and accessibility behavior

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
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
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0187` (QA-001, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0187 QA-001 SKIPPED_DEPENDENCY -> 0191 QA-005 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
