# 0069 - Create the canonical ActionCard shell

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Create one stateless action-card shell that standardizes title/header, close control, body, footer and responsive width/layout across action-overlay feature components.

Source: `UI-011` in Series `0001`.

## Context

At least six action components duplicate `action-card-close-btn`, header/body/footer structure and responsive card sizing. `styles.css` contains action-card helper classes, but each feature still owns large repeated shells. After `0068`, the outer dialog/overlay owns modal semantics; this task normalizes the inner feature card.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/`
- `MercurionWebNg/src/styles.css` action-card helpers
- canonical Dialog shell from `0068`
- canonical IconButton from `0060`
- canonical ActionFooter from `0061`

## In scope

- Implement a stateless action-card shell with title/header, body, optional footer and close slot/action.
- Define finite responsive width/size variants.
- Compose canonical close and footer primitives.
- Migrate action components that share the repeated shell.
- Remove duplicated structural markup/helper CSS after migration.
- Add component and representative feature tests.

## Out of scope

- Feature business state/step logic.
- Outer modal focus/backdrop semantics (`0068`).
- Redesigning action content.

## Decisions already made

- The card is presentation/layout only; feature state stays in the action component/session.
- The outer Dialog owns `role=dialog`, focus trap and scroll lock; ActionCard must not duplicate those semantics.
- Close action is explicit and may be omitted/disabled according to the outer flow policy.
- Widths are semantic finite variants, not arbitrary per-feature Tailwind strings.

## Requirements

1. Inventory action-component shell structures and identify common header/body/footer/width patterns.
2. Implement one action-card primitive using content projection/typed slots.
3. Compose `IconButton` for close and `ActionFooter` for standard action regions.
4. Define responsive sizing variants sufficient for current flows without one variant per component.
5. Migrate all compatible action components while preserving their step/content logic.
6. Remove obsolete duplicated header/close/footer structural CSS and markup.
7. Add tests for title, close presence, body/footer projection and responsive variant classes/semantics.

## Acceptance criteria

- [ ] Compatible action components use one ActionCard shell.
- [ ] Header/body/footer/close structure is no longer duplicated per feature.
- [ ] Responsive widths come from a finite canonical variant set.
- [ ] Dialog semantics remain exclusively owned by the outer dialog shell.
- [ ] Feature behaviour remains unchanged.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run ActionCard tests and representative migrated action-component tests, search for obsolete action-card structural helpers, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, open several action scopes with short/long and multistep content at desktop/mobile widths; verify title/close/body/footer layout, scroll behaviour and no nested dialog semantics in the accessibility tree.

## Stop conditions

Mark `BLOCKED` if a feature currently depends on a materially different shell whose UX purpose cannot be represented by a bounded canonical size/layout variant. Document the exception rather than turning ActionCard into an arbitrary-class wrapper.

## Dependencies

- `0060-create-the-accessible-iconbutton-primitive.md`
- `0061-create-the-canonical-actionfooter-primitive.md`
- `0068-create-the-canonical-dialog-and-overlay-shell.md`

## Implementation notes

Keep feature conditionals inside projected content. The shell should not learn action-scope names or step enums.

## Execution notes

### Feature branch
No task branch or worker was created because hard prerequisites `0060`
(`UI-002`), `0061` (`UI-003`), and `0068` (`UI-010`) are terminal
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. All direct UI primitive
and dialog-shell prerequisites are `SKIPPED_DEPENDENCY`, with transitive
blocked root cause `0052-standardize-modern-angular-component-apis.md`
(`FE-030`).

### Task-specific validation performed
No implementation or validation was performed.

### Full pre-merge CI-parity validation
Not applicable; no feature branch was created.

### Browser validation performed
Not applicable; the task was skipped before implementation.

### Commits
Only this task metadata was updated on `develop`.

### Merge / CI
No feature merge; skip metadata CI is required before continuing.

### Rollback
_Not applicable._

### Blocker / human decision required
No implementation blocker. Re-enable only after the direct prerequisite chains
are deliberately resolved in a new authorized session.