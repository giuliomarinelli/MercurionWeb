# 0068 - Create the canonical Dialog and Overlay shell

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

> Current status (2026-09-11): PENDING by direct owner instruction because this
> activity was not completed. Historical attempt/skip evidence remains below
> for traceability and is not a terminal outcome.

### Feature branch
No task branch or worker was created because hard prerequisite
`0060-create-the-accessible-iconbutton-primitive.md` (`UI-002`) is
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. `UI-002` is terminal
`SKIPPED_DEPENDENCY`, with transitive blocked root cause
`0052-standardize-modern-angular-component-apis.md` (`FE-030`).

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
No implementation blocker. Re-enable only after the dependency chain through
FE-030 is deliberately resolved in a new authorized session.

### Execution notes — UI-010 implementation (2026-09-12)

#### Feature branch and base

- Branch: `feature/UI-010`
- Base: `c1f7b3f31d671b5aca67741b84e1d30055d85bf1`
- `origin/develop` matched the base exactly before branch creation.
- Exact base CI evidence: GitHub Actions run `34658537669`, CI, success, for
  `c1f7b3f31d671b5aca67741b84e1d30055d85bf1` (merge of UI-009).
- No `npm ci` or `npm run ci:check` was run locally.

#### Implementation

- Added `DialogShellComponent` and `DialogScrollLockService` as the shared
  projected-content shell. It owns the dialog role/modal state, explicit typed
  Escape/backdrop policy, CDK focus trap, initial focus, opener restoration,
  nested reference-counted body scroll lock, and destroy cleanup.
- Migrated the common portal modal, action overlay, and molecule search overlay
  to the canonical shell. Existing action-session state and feature content
  remain owned by their existing contexts/components.
- Added lifecycle/accessibility tests covering modal semantics, scroll lock,
  Escape policy, focus restoration, and disabled dismissal policy.

#### Validation

- `npm run typecheck --workspace mercurion_web_ng` — passed.
- Focused Angular tests:
  `npx ng test --watch=false --browsers=ChromeHeadless
  --include=...dialog-shell.component.spec.ts
  --include=...modal.component.spec.ts
  --include=...action-overlay.component.spec.ts
  --include=...search-overlay.component.spec.ts` — 8 tests passed.
- Angular watch build completed successfully during the canonical runtime
  startup.
- Angular lint completed with only pre-existing repository warnings; the
  changed shell/modal/action/search files had no lint errors after the
  template correction.

#### Browser/runtime evidence

- Started Tox21, Nest, and Angular in the required order using the canonical
  commands and kept each execution session alive. Two consecutive complete
  readiness rounds returned HTTP 200 from `/health` and `/dashboard`.
- Through Chrome DevTools MCP at `http://localhost:8888/dashboard`, the
  authenticated dashboard loaded in the dedicated persistent profile.
- Standard search modal: accessibility snapshot exposed exactly one
  `dialog` named “Ricerca molecolare” with `modal`; body overflow was
  `hidden`, and Escape closed it with focus restored to “Cerca molecola...”.
- Action overlay: accessibility snapshot exposed exactly one `dialog` named
  “Seleziona collezione” with `modal`; initial focus was inside the overlay,
  Tab/Shift+Tab remained contained, Escape closed it, and body overflow
  returned to empty.
- Repeated action-overlay open/Escape cycles and repeated mobile-width
  (390×844) open/Escape cycles succeeded. Desktop viewport was restored to
  1280×900. No browser console or runtime blocker was observed.
- All task-owned Tox21, Nest, and Angular sessions were stopped after evidence
  capture.

#### Commit

- Task commit: recorded on `feature/UI-010` with `--no-gpg-sign` and the
  required Copilot co-author trailer.
