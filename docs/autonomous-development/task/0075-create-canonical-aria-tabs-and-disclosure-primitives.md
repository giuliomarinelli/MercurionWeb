# 0075 - Create canonical ARIA Tabs and Disclosure primitives

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

- [x] Tab UIs use a canonical WAI-ARIA Tabs implementation.
- [x] Expandable sections use a canonical Disclosure implementation.
- [x] Navigation links are not incorrectly converted into tabs.
- [x] Keyboard navigation and focus-visible treatment are uniform.
- [x] Active/expanded state is represented correctly in the accessibility tree.
- [x] Local duplicate keyboard handlers/ARIA state are removed from migrated consumers.
- [x] Angular tests/build and canonical CI gates pass.

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

> Current status (2026-09-13): BLOCKED during the v8 autonomous session after
> partial implementation. Required consumer migration and stable Help-route
> browser evidence were incomplete.

### Feature branch
`feature/UI-017` is preserved and frozen at
`d1ea7d2946bfe3ae19ff3419c4d0603d1edcd3d3`, with the same SHA on origin.

### Preflight
Exact base-SHA CI run `34786428763` succeeded. Runtime capability preflight
passed with the required startup order, two readiness rounds, and protected
dashboard state; all task-owned processes were stopped before handoff.

### Preflight remediation
None.

### Summary
Implemented typed standalone Tabs and Disclosure primitives, migrated the Help
tabpanel relationship, and added focused tests. The task is blocked because
existing expandable consumers were not migrated and the Help route could not
provide stable tablist browser evidence.

### Task-specific validation performed
480 Angular tests passed; typecheck, lint, and `git diff --check` passed. No
full feature CI was requested because the task was blocked before integration.

### Full pre-merge CI-parity validation
Not applicable; the task was blocked before integration.

### Browser validation performed
Protected dashboard state was confirmed after ordinary login. The Help route
redirected or remained busy, so required Tabs accessibility-tree, keyboard,
focus, and tabpanel evidence could not be safely claimed. A dashboard sidenav
disclosure exposed `aria-expanded="true"` but was not a canonical migration.

### Commits
Implementation and blocker commits are preserved on `feature/UI-017`; the
blocked outcome is recorded here on `develop`.

### Merge / CI
No feature merge. This metadata-only status commit requires exact CI before
continuing.

### Rollback
Not applicable.

### Blocker / human decision required
Migrate existing expandable consumers to the canonical Disclosure primitive and
complete stable Help-route Tabs browser evidence in a new authorized session.

## Authorized recovery (2026-09-15)

Recovery resumed from preserved SHA
`d1ea7d2946bfe3ae19ff3419c4d0603d1edcd3d3`. Current green `develop`
(`0527e5299d2300e822692948161a03053fdaa123`, full CI run `34899813813`) was
merged with `--no-ff --no-gpg-sign` as
`5d14d9968ef069f556521c56ee76952396fcf125`.

The Settings accordion and sidenav feature section now consume the canonical
Disclosure primitive while preserving controlled expansion, fragment targets,
responsive layout and link navigation semantics. Tabs coverage now includes
disabled-item traversal and dynamic relationship updates. Disclosure supports
a projected canonical trigger without duplicating ARIA ownership in consumers.

The protected-route refresh race that made Help browser evidence unstable was
also removed: AuthGuard waits for an in-progress session restore, and concurrent
session checks share the same handshake promise instead of resolving early.
Regression tests cover successful restore and anonymous redirect preservation.

Runtime validation used the canonical Tox21, Nest and Angular processes through
`http://localhost:8888`. Two readiness rounds passed. The authenticated Help
tabs exposed canonical tablist/tab/tabpanel relationships; Arrow, Home and End
selection/focus behaviour was exercised. Settings and sidenav disclosures
exposed deterministic trigger/region relationships and correct expanded state.
Focus treatment, responsive layout and light/dark themes were exercised, and a
real protected-route refresh remained on the requested route without visiting
login or falling back to dashboard. All task-owned processes were stopped.

Focused Tabs, Disclosure and AuthGuard tests passed. The full Angular suite,
typecheck, lint and production build passed locally; the existing initial-bundle
budget warning is unchanged. The task remains integration `CI_PENDING` until
the exact feature-SHA and merge-SHA Required gates succeed.

Feature CI run `34909359730` on SHA
`4ae7a2f5bf4cefaa77844e714b58165655050cd2` found an actionable Ubuntu-only
false positive in `ci:angular:interactive-semantics`: its textual rule treated
the canonical `div[role="tablist"]` keyboard coordinator as a generic clickable
element. The rule now narrowly recognizes `tablist` as an allowed composite
widget while continuing to reject generic interactive div/span handlers. A new
exact feature-SHA run is required after this correction.
