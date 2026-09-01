# 0068 - Create the canonical Dialog and Overlay shell

- [ ] DONE
- [ ] BLOCKED

## Objective

Create one canonical dialog/overlay shell that owns focus trap and restoration, Escape/backdrop policy, scroll locking, accessible title/description wiring and common modal presentation.

Source: `UI-010` in Series `0001`.

## Context

The repository has a common modal component plus the application action overlay and feature-local dialog/panel shells. `ActionOverlayComponent` currently applies dialog ARIA directly to its backdrop/content container while action components build their own interior structures. Focus trapping/restoration, Escape behaviour, backdrop handling and scroll locking are not owned by one canonical layer.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/modal/`
- `MercurionWebNg/src/app/components/action-components/action-overlay/action-overlay.component.ts`
- `MercurionWebNg/src/app/services/context/action-context/action-overlay-context.service.ts`
- feature-local modal/dialog panels
- `0058` action-session isolation/state model
- canonical IconButton from `0060`

## In scope

- Implement a reusable canonical dialog/overlay shell.
- Own dialog role, modal state, labelled-by/described-by, focus trap and focus restoration.
- Define typed Escape and backdrop-dismiss policies.
- Own document/body/application scroll-lock lifecycle.
- Provide consistent backdrop/container layering and transition hooks.
- Migrate common modal and action overlay shell usage.
- Add focus/accessibility/lifecycle tests.

## Out of scope

- Feature-specific dialog body/business state.
- Action-card interior shell (`0069`).
- Reworking action-overlay domain state beyond integration with `0058`.

## Decisions already made

- Modal dialogs expose exactly one canonical focus-management owner.
- Focus returns to the element that opened the dialog when that element still exists/is valid.
- Escape/backdrop dismissal is an explicit typed policy; destructive/in-flight flows may disable dismissal deliberately.
- Scroll lock is reference/lifecycle safe and always cleaned up, including interrupted closes/destroy.
- Accessible name/description are required by contract rather than inferred from arbitrary DOM text.

## Requirements

1. Inventory common modal, action overlay and feature-local dialog shells and their current close/focus behaviour.
2. Implement canonical dialog state/view wrapper compatible with projected feature content.
3. Trap focus within the active modal and restore opener focus on close.
4. Handle Escape/backdrop according to explicit policy, with no duplicate close events.
5. Implement deterministic scroll locking and cleanup across rapid open/close/destroy.
6. Wire title/description IDs and accessibility attributes without feature-local duplication.
7. Migrate existing modal/action-overlay shells while preserving visual layout and business close rules.
8. Add tests for initial focus, tab cycle, Shift+Tab, Escape, backdrop, focus restore, nested/rapid lifecycle policy and cleanup.

## Acceptance criteria

- [ ] Modal/action overlay shells share one canonical dialog implementation.
- [ ] Focus is trapped and restored correctly.
- [ ] Escape/backdrop policy is explicit and test-covered.
- [ ] Scroll lock is deterministic and never leaks after close/destroy.
- [ ] Dialog accessible name/description are valid.
- [ ] Existing feature content/flows remain compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused dialog/focus lifecycle tests, representative modal/action-overlay component tests and canonical CI-parity validation.

## Browser validation

Mandatory through Chrome DevTools MCP at `http://localhost:8888`:

1. open representative standard modal and action overlay;
2. verify initial focus, Tab/Shift+Tab containment and Escape/backdrop policy;
3. inspect role/name/description/modal state in accessibility tree;
4. close and verify focus returns to the opener;
5. verify background scroll is locked only while modal is active;
6. repeat rapid open/close and light/dark/mobile states.

## Stop conditions

Mark `BLOCKED` if multiple existing overlays intentionally have unresolved incompatible dismissal/focus policies. Do not silently choose a less safe dismissible behaviour for destructive/security-sensitive flows.

## Dependencies

- `0058-isolate-action-context-payloads-per-open-session.md`
- `0060-create-the-accessible-iconbutton-primitive.md`

## Implementation notes

A headless focus/overlay controller plus a rendered shell is acceptable. Avoid inventing a second state machine that conflicts with the action-session state model.

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
