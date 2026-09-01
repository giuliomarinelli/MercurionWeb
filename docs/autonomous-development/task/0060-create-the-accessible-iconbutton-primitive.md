# 0060 - Create the accessible IconButton primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Introduce one canonical accessible `IconButton` primitive for close and other icon-only actions, then replace replicated icon-only button markup and the legacy close-button variants with that primitive.

Source: `UI-002` in Series `0001`.

## Context

The repository already contains `CloseButtonComponent`, while multiple action components still render their own native close buttons using `action-card-close-btn`. The current close component exposes several ARIA inputs and computes Tailwind size classes dynamically, while action components duplicate the SVG/markup and accessible labels independently. Icon-only controls elsewhere follow similar local patterns.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/close-button/close-button.component.ts`
- `MercurionWebNg/src/styles.css` (`action-card-close-btn`)
- `MercurionWebNg/src/app/components/action-components/`
- other icon-only native buttons across `MercurionWebNg/src/app/`
- canonical Button styling/tokens from `0059`

## In scope

- Implement a stateless typed `IconButton` primitive.
- Require an accessible name through a type/API contract.
- Support semantic variants and sizes without arbitrary feature class strings.
- Migrate close controls and other icon-only actions.
- Remove superseded close-button/duplicated markup where no consumer remains.
- Add accessibility and interaction tests.

## Out of scope

- Ordinary text/label buttons (`0059`).
- Dialog focus trapping (`0068`).
- Redesigning the icon asset system beyond what is required for projection/slots.

## Decisions already made

- Icon-only controls are real native buttons, never clickable `div`/`span` wrappers.
- An icon alone is never the accessible name; every consumer supplies an explicit accessible label or labelled-by relationship through a validated API.
- Disabled state uses the native button contract.
- Feature components own action semantics; `IconButton` only emits activation.
- The primitive reuses the visual/focus token language established by the canonical Button rather than establishing a parallel control system.

## Requirements

1. Inventory `CloseButtonComponent`, `action-card-close-btn` consumers and other icon-only native buttons.
2. Create a typed API for icon, size, variant, disabled and accessible naming.
3. Ensure projected SVG/icon content cannot accidentally become the only accessible text.
4. Migrate action-card close buttons and the existing close-button consumers without changing close behaviour.
5. Preserve any legitimate `aria-describedby`/`aria-labelledby` relationships needed by consumers.
6. Remove the legacy component and shared CSS helper if fully superseded.
7. Add tests for keyboard activation, accessible name, disabled behaviour and representative variants.
8. Add a regression test/static rule for icon-only controls missing an accessible name where practical.

## Acceptance criteria

- [ ] All icon-only application actions use the canonical `IconButton` or an explicitly documented native exception.
- [ ] Every icon-only action has an accessible name.
- [ ] Replicated close-button SVG/markup and `action-card-close-btn` usage are eliminated.
- [ ] Legacy close-button implementation is removed if no longer needed.
- [ ] Keyboard/focus/disabled behaviour is consistent.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused component/accessibility tests, search for remaining duplicated close-button markup/class usage, then the canonical CI-parity gate.

## Browser validation

Using Chrome DevTools MCP at `http://localhost:8888`:

1. open representative action overlays and any modal with an icon-only close action;
2. verify the button is focusable, named in the accessibility tree and activatable by keyboard;
3. verify focus ring/hover/disabled states in light and dark themes;
4. confirm close behaviour is unchanged and no duplicate activation occurs.

## Stop conditions

Mark `BLOCKED` if an existing icon-only control intentionally has non-button semantics that require an unresolved product/accessibility decision. Do not preserve inaccessible semantics just to avoid a migration.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`

## Implementation notes

Avoid dynamic Tailwind class construction that the build cannot statically discover. Prefer a finite compile-time mapping from typed variants/sizes to complete class strings or CSS tokens.

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