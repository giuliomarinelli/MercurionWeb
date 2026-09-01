# 0067 - Normalize interactive element semantics

- [ ] DONE
- [ ] BLOCKED

## Objective

Ensure every user interaction uses the correct native semantic element: actions use buttons, navigation uses links/routerLink, and no clickable generic container remains without a justified accessible interaction contract.

Source: `UI-009` in Series `0001`.

## Context

The audit found inconsistent interaction semantics across templates: native buttons, anchors and click handlers on generic containers are used interchangeably. This creates keyboard/focus/ARIA drift and makes canonical controls harder to enforce.

## Relevant files and modules

- all Angular production templates/components
- route manifest/navigation work from `0057`
- canonical Button/IconButton from `0059`/`0060`
- cards/list items that currently handle `(click)` on wrappers

## In scope

- Inventory interactive generic elements and misused anchors/buttons.
- Convert actions to native/canonical buttons.
- Convert navigation to anchors/routerLink with meaningful href semantics.
- Preserve focus order, disabled semantics and pointer interaction.
- Add static/accessibility regression checks where practical.
- Add representative keyboard tests.

## Out of scope

- Visual redesign of cards/components.
- Changing navigation destinations or business actions.
- ARIA widget patterns owned by select/dialog/tabs tasks.

## Decisions already made

- Action versus navigation semantics are determined by behaviour, not existing styling.
- A `div`/`span` with `(click)` is not accepted merely by adding `role=button`; use a native button unless a documented widget pattern requires otherwise.
- Navigational controls retain real link semantics so open-in-new-tab, URL preview and browser navigation remain available where applicable.
- Disabled links/actions require explicit semantic handling, not only opacity/pointer CSS.

## Requirements

1. Search production templates for click/keyboard handlers on non-interactive elements and anchors used as commands.
2. Classify each interaction as action, navigation or part of a composite ARIA widget.
3. Replace actions with canonical/native buttons and navigation with `routerLink`/anchor semantics.
4. Preserve event propagation only when intentionally required; remove ad-hoc keydown handlers that merely emulate button activation.
5. Ensure interactive cards expose a clear focusable target rather than making an entire generic container pseudo-clickable without semantics.
6. Add lint/template/static rules where Angular tooling can reliably prevent regression.
7. Add representative keyboard/focus tests for migrated patterns.

## Acceptance criteria

- [ ] No ordinary clickable `div`/`span` remains in production templates.
- [ ] Actions use buttons and navigations use links/routerLink.
- [ ] Keyboard activation/focus comes from native semantics wherever possible.
- [ ] Composite widgets are documented and conform to their dedicated ARIA pattern.
- [ ] No navigation/business behaviour changes unintentionally.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run static/template scans, focused migrated component tests and canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, keyboard-navigate representative pages/cards/actions. Verify Tab order, Enter/Space behaviour, link URLs, visible focus and absence of pointer-only interactions.

## Stop conditions

Mark `BLOCKED` if a generic interactive element is actually part of a complex widget whose correct keyboard/ARIA semantics are owned by a later dedicated task and cannot be safely migrated independently. Document the dependency rather than applying a superficial role/tabindex patch.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`
- `0060-create-the-accessible-iconbutton-primitive.md`
- `0057-create-a-typed-route-manifest.md`

## Implementation notes

Prioritize native HTML semantics over ARIA emulation. ARIA supplements semantics; it should not recreate a native button/link unnecessarily.

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