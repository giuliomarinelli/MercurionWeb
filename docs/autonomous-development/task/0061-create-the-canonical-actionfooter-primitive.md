# 0061 - Create the canonical ActionFooter primitive

- [ ] DONE
- [ ] BLOCKED

## Objective

Create a stateless `ActionFooter` primitive that standardizes primary/secondary action ordering, responsive layout, pending state and disabled behaviour across forms and action overlays.

Source: `UI-003` in Series `0001`.

## Context

Multiple action components repeat an `action-card-footer` container and then independently reconstruct cancel/back/confirm/submit buttons with different class strings and conditional layouts. `styles.css` already contains an `action-card-footer` helper, but structure, button order and pending/disabled semantics remain feature-owned and inconsistent.

## Relevant files and modules

- `MercurionWebNg/src/styles.css`
- `MercurionWebNg/src/app/components/action-components/create-collection/`
- `.../sensitive-data-change/`
- `.../profile-registry-edit/`
- `.../select-collection-then-route/`
- `.../bind-collections-to-molecule/`
- `.../add-molecules-to-collection/`
- canonical `Button` from `0059`

## In scope

- Add a stateless footer layout primitive for action/form flows.
- Define a canonical responsive order/layout for primary and secondary actions.
- Support pending and disabled state consistently.
- Migrate repeated action footers.
- Remove obsolete structural helper CSS where superseded.
- Add component and representative flow tests.

## Out of scope

- Action-card header/body shell (`0069`).
- Business-specific multistep state machines.
- Changing labels or action semantics.

## Decisions already made

- `ActionFooter` owns layout and visual hierarchy, not business logic.
- Actions are supplied as projected/typed button slots/configuration using the canonical Button.
- Pending state must prevent duplicate primary action while preserving an understandable UI.
- Responsive ordering is uniform unless a documented UX requirement requires an explicit variant.

## Requirements

1. Inventory repeated footer structures and classify primary/secondary/back/cancel patterns.
2. Implement a small API that can render/project primary and secondary action regions without importing feature services.
3. Define mobile and desktop ordering explicitly and test it.
4. Standardize pending/disabled presentation using `Button` rather than local class toggles.
5. Migrate all action-card/footer consumers that match the pattern.
6. Preserve multistep conditional visibility while moving only layout responsibility into the primitive.
7. Remove dead `action-card-footer` CSS or reduce it to design-system implementation detail.
8. Add tests for one-action, two-action, pending and disabled states.

## Acceptance criteria

- [ ] Repeated action/form footer layout is represented by `ActionFooter`.
- [ ] Primary/secondary ordering and responsive behaviour are consistent.
- [ ] Pending/disabled semantics use the canonical Button contract.
- [ ] Feature components no longer own duplicated footer layout classes.
- [ ] Existing flow behaviour remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused footer tests plus representative action-component tests, then the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, inspect at least three migrated action flows at mobile and desktop widths. Verify action order, wrapping, pending/disabled behaviour and keyboard focus order.

## Stop conditions

Mark `BLOCKED` if existing flows intentionally require incompatible primary/secondary ordering and the repository does not establish which pattern is canonical. Document the affected flows instead of adding an unbounded per-feature layout mode.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`

## Implementation notes

Prefer content projection or a narrow typed action contract. Do not make `ActionFooter` aware of form models or specific action scopes.

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