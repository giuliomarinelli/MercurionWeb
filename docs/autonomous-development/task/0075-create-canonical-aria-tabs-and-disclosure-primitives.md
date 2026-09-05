# 0075 - Create canonical ARIA Tabs and Disclosure primitives

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Replace local tab and expandable-section interaction patterns with canonical accessible Tabs and Disclosure primitives implementing uniform keyboard navigation, active/expanded state and focus treatment.

Source: `UI-017` in Series `0001`.

## Context

Tabs and expandable sections currently implement their indicators, focus and interaction locally. Similar-looking controls therefore differ in keyboard behaviour and ARIA state. This task establishes the two distinct canonical patterns rather than treating both as generic clickable headings.

## Relevant files and modules

- Angular components/templates implementing tab bars
- expandable/collapsible section components and accordions
- settings/detail/navigation subsections using local active/expanded state
- canonical Button/interactive semantics from `0059` and `0067`

## In scope

- Implement a canonical Tabs primitive following the WAI-ARIA tabs pattern.
- Implement a canonical Disclosure primitive for independent expandable sections.
- Standardize keyboard navigation, focus-visible styling and active/expanded semantics.
- Migrate existing compatible tab/disclosure patterns.
- Preserve caller-owned selected/expanded state when controlled usage is required.
- Add accessibility/keyboard tests.

## Out of scope

- Route-level navigation that is semantically links rather than tabs.
- Select/combobox interaction (`0064`).
- Dialog/overlay focus management (`0068`).
- Changing domain content or section hierarchy.

## Decisions already made

- Tabs and disclosures are different accessible patterns and remain separate primitives even if they share design tokens.
- A navigation bar that changes URL/document destination remains link navigation, not an ARIA tablist merely because it looks tab-like.
- Tablist keyboard navigation follows a single documented orientation/activation policy.
- Disclosure controls are native/canonical buttons exposing `aria-expanded` and their controlled region relationship.
- Feature components do not recreate keyboard/focus logic locally after migration.

## Requirements

1. Inventory existing tab-like and expandable-section patterns and classify each correctly as tabs, disclosure, or navigation.
2. Implement typed Tabs state/inputs/outputs with `tablist`, `tab`, `tabpanel`, selected state and deterministic IDs/relationships.
3. Implement Arrow/Home/End keyboard navigation and the chosen automatic/manual activation policy consistently.
4. Implement Disclosure with native button semantics, `aria-expanded` and `aria-controls` relationships.
5. Preserve focus through state changes and ensure hidden/inactive content is handled correctly for keyboard and assistive technology.
6. Migrate compatible existing consumers and remove local keyboard/ARIA implementations.
7. Define horizontal/vertical styling/behaviour only where current product use requires it.
8. Add tests for keyboard navigation, active/expanded state, IDs/relationships, disabled items where supported and dynamic content updates.

## Acceptance criteria

- [ ] Tab UIs use a canonical WAI-ARIA Tabs implementation.
- [ ] Expandable sections use a canonical Disclosure implementation.
- [ ] Navigation links are not incorrectly converted into tabs.
- [ ] Keyboard navigation and focus-visible treatment are uniform.
- [ ] Active/expanded state is represented correctly in the accessibility tree.
- [ ] Local duplicate keyboard handlers/ARIA state are removed from migrated consumers.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused Tabs/Disclosure tests, representative migrated feature tests and the canonical CI-parity gate.

## Browser validation

Mandatory through Chrome DevTools MCP at `http://localhost:8888`:

1. operate representative tabs using Tab, Arrow keys, Home/End and Enter/Space as appropriate;
2. inspect tablist/tab/tabpanel relationships and selected state in the accessibility tree;
3. operate a disclosure using keyboard and verify `aria-expanded`/controlled region;
4. verify focus ring, responsive behaviour and light/dark themes.

## Stop conditions

Mark `BLOCKED` if an existing tab-looking control actually mixes URL navigation and local panel selection in a way whose intended semantics cannot be established from repository behaviour. Do not choose an ARIA pattern based only on appearance.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`
- `0067-normalize-interactive-element-semantics.md`

## Implementation notes

Use native focusable elements and DOM order; avoid maintaining a parallel manually indexed focus graph when roving tabindex can represent the tab pattern cleanly.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
Not attempted. Both required canonical interactive primitives are terminally
unavailable: task 0059 (UI-001) and task 0067 (UI-009) are
`SKIPPED_DEPENDENCY` because their prerequisite chain includes task 0052
(FE-030), which is `BLOCKED`.

### Task-specific validation performed
Not applicable; no feature branch or implementation worker was created.

### Full pre-merge CI-parity validation
Not applicable; dependency-skip metadata only.

### Browser validation performed
Not applicable; the task was not attempted.

### Commits
Pending metadata commit on `develop`.

### Merge / CI
No feature branch or merge. Exact-SHA CI is required for the metadata commit.

### Rollback
_Not applicable._

### Blocker / human decision required
Direct terminal prerequisites: 0059 (UI-001) and 0067 (UI-009), both
`SKIPPED_DEPENDENCY`. Transitive dependency chain: UI-017 -> UI-001 ->
FE-030 (BLOCKED); UI-017 -> UI-009 -> FE-030 (BLOCKED). FE-030 requires
filesystem-write capability for a fresh, human-authorized worker session.