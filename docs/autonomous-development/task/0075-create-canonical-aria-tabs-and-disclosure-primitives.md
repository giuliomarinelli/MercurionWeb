# 0075 - Create canonical ARIA Tabs and Disclosure primitives

- [ ] DONE
- [x] BLOCKED
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

> Current status (2026-09-11): PENDING by direct owner instruction because this
> activity was not completed. Historical attempt/skip evidence remains below
> for traceability and is not a terminal outcome.

### Feature branch
`feature/UI-017`

### Preflight
Unchanged task-start preflight passed on `feature/UI-017` at base
`5e3071dea502a1d45b1ece0285c9f98f60ec0bb8`. The working tree was clean, the
branch identity matched, local `commit.gpgSign` was `false`, no
workspace-consuming runtime or watcher was active, and GitHub Actions run
`34786428763` for the exact base SHA completed successfully. The canonical
runtime capability probe was also completed in the required order (Tox21,
Nest, Angular), with two consecutive `health=200`/Angular `200` readiness
rounds and a protected dashboard response after ordinary local-account login.

### Preflight remediation
None.

### Summary
Implemented a typed, standalone Tabs primitive with deterministic tab/panel
IDs, WAI-ARIA roles and relationships, roving tabindex, horizontal/vertical
orientation, disabled-item handling, automatic Arrow/Home/End activation and
focus restoration. Added a standalone Disclosure primitive with native button
semantics, controlled-region relationships and expanded-state output. Migrated
the help page's existing tab panel relationship and added component tests.

The attempt remains `BLOCKED`: the existing expandable-section consumers
(notably the settings CDK accordion and sidenav local disclosure) were not
migrated to the new canonical Disclosure before the acceptance boundary, and
post-implementation browser validation could not obtain a stable representative
help tablist through `http://localhost:8888/help` (the route repeatedly
redirected to the dashboard or remained busy, so no tablist accessibility
snapshot or keyboard tab evidence was obtained). A dashboard navigation
disclosure was keyboard-operated and exposed `aria-expanded="true"`, but that
does not close the missing canonical migration/tab evidence gap.

### Task-specific validation performed
- `npm run test:ci --workspace mercurion_web_ng -- --include=...`: Angular
  test run completed `480 SUCCESS` (the CLI forwarded the include arguments as
  npm config warnings and executed the full existing Angular suite).
- `npm run typecheck --workspace mercurion_web_ng`: passed.
- `npm run lint:angular --workspace mercurion_web_ng -- --no-warn-ignored`:
  passed.
- `git diff --check`: passed.
- Post-implementation runtime was started in the required Tox21/Nest/Angular
  order, reached two complete readiness rounds, and all three task-owned
  processes were stopped and confirmed absent.

### Full pre-merge CI-parity validation
Not run locally by policy. `npm ci` and `npm run ci:check` were not run.
Exact feature-SHA CI remains coordinator-owned and was not requested because
the worker result is `BLOCKED`.

### Browser validation performed
Canonical edge only: `http://localhost:8888`. Capability preflight reached the
authenticated dashboard using a fresh ordinary login flow and protected
server-backed state. Post-implementation dashboard keyboard evidence showed the
existing “Funzionalità” disclosure changing from collapsed to
`aria-expanded="true"`; attempts to reach `/help` did not produce a stable
tablist snapshot, so the required Tabs Arrow/Home/End and tabpanel evidence is
not claimed.

### Commits
Pending worker diagnostic/partial-work commit on `feature/UI-017`.

### Merge / CI
No merge. The feature branch is preserved for coordinator review.

### Rollback
Not applicable.

### Blocker / human decision required
Complete the migration of existing settings/sidenav expandable consumers to
`m-disclosure`, then repeat the representative authenticated Tabs/Disclosure
browser acceptance through the canonical edge and capture the tablist,
tabpanel, keyboard, focus-visible and theme evidence.
