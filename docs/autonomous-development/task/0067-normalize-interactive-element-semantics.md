# 0067 - Normalize interactive element semantics

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

> Current status (2026-09-12): Implemented on `feature/UI-009` from
> `origin/develop` at `6142789435e153393f8e47bc238e205256b99037`. The historical
> dependency-skip text below was superseded by the direct owner instruction and
> the now-available canonical UI primitives/route manifest.

### Feature branch
`feature/UI-009`

### Preflight
- Verified clean `develop` matched `origin/develop` at
  `6142789435e153393f8e47bc238e205256b99037`; recent exact merge CI for
  `Merge feature/UI-008: canonical selection control primitive` was successful.
- Verified effective repository-local `commit.gpgSign=false`.
- Confirmed no task-owned Angular, Nest, Tox21, Karma, or workspace watcher
  process was active before runtime startup.
- Runtime capability preflight started Tox21, Nest, and Angular in the required
  order. All three remained alive; Nest reported zero compile errors and
  connected to Tox21. Two complete edge readiness rounds returned HTTP 200 for
  `/health` and `/`.
- Performed a fresh ordinary login through `/login` using the local test
  account and proved the protected dashboard state.
- Stopped all three preflight runtime processes before editing.

### Summary
- Migrated action interactions from generic containers/spans to native
  buttons, including header search, off-canvas/mobile dismiss controls,
  sidenav feature disclosure, file upload dropzone, notebook page selection,
  search result selection, and select-all controls.
- Removed the redundant clickable ticket-card wrapper while retaining the
  native overlay button that emits the existing detail action.
- Removed ad-hoc Enter/Space handlers where native button semantics now provide
  keyboard activation; preserved navigation links and existing destinations.
- Added `scripts/check-angular-interactive-semantics.mjs` and registered it in
  `ci:static`. The check rejects ordinary generic click/keyboard controls and
  command anchors without navigation semantics while documenting dialog/option
  composite-widget and event-boundary exceptions.
- Added representative select-all button/focus activation tests.

### Task-specific validation performed
- `npm run ci:angular:interactive-semantics` — passed.
- `npm run lint --workspace mercurion_web_ng` — passed with existing warnings,
  no errors.
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- Focused Angular specs for both migrated select-all components — 4 specs
  passed under ChromeHeadless.
- `git diff --check` — passed.

### Full pre-merge CI-parity validation
Not run locally by policy; `npm ci` and `npm run ci:check` are reserved for
GitHub Actions. Exact feature-SHA CI remains coordinator-owned.

### Browser validation performed
- Restarted the canonical Tox21, Nest, and Angular processes after
  implementation and obtained two consecutive HTTP 200 readiness rounds via
  `http://localhost:8888/health` and `http://localhost:8888/`.
- Fresh login through `http://localhost:8888/login` succeeded and rendered the
  protected dashboard.
- Dashboard accessibility snapshot exposed the converted search control and
  `Funzionalità` disclosure as native buttons. Tab focused the search button and
  Enter opened the molecular search dialog, proving keyboard activation.
- Navigated through the sidebar link to
  `/molecules/all-my-molecules`; the rendered cards exposed real molecule
  links plus native action buttons with meaningful labels and URLs.
- Stopped every post-validation runtime process and verified no
  Tox21/Nest/Angular/Karma workspace process remained.

### Commits
Implementation and task metadata commits are recorded below after commit.

### Merge / CI
Feature branch publication and exact feature-SHA CI are coordinator-owned.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
