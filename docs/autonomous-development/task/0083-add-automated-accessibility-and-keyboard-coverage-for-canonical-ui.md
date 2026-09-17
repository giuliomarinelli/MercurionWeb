# 0083 - Add automated accessibility and keyboard coverage for canonical UI

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one deterministic accessibility test suite for canonical Angular primitives and critical interaction flows, including automated axe checks and explicit keyboard/focus-order assertions.

Source: `UI-025` in Series `0001`.

## Context

Accessibility semantics currently vary across fields, icons, focus handling and live feedback. Tasks `0059`-`0076` establish canonical controls/shells, making this the point where their accessibility contract can be tested once rather than rediscovered per feature. The Angular package currently uses Karma/Jasmine and Chrome; no axe-specific dependency is present in the audited package manifest.

## Relevant files and modules

- canonical UI primitives created by `0059`-`0076`
- `MercurionWebNg/src/test.ts` and Angular test configuration
- `MercurionWebNg/package.json`
- auth/search/action/collection flows that compose the primitives
- root canonical CI aggregate

## In scope

- Add an accessibility assertion helper based on `axe-core` or a thin compatible wrapper in the existing Angular browser test stack.
- Cover every canonical interactive primitive and representative composed states.
- Add keyboard navigation/focus tests for dialogs, icon controls, selection controls, select/combo controls, pagination, tabs/disclosures and action flows.
- Test live-region/error/status semantics for loading, validation, toast and asynchronous feedback.
- Cover representative critical flows without introducing a second redundant end-to-end framework solely for this task.
- Add one deterministic accessibility command/gate to `ci:check`.

## Out of scope

- Do not claim automated axe checks replace manual usability/accessibility review.
- Do not suppress real violations globally to achieve green output.
- Do not require an external hosted accessibility service.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Reuse Karma/Jasmine/browser testing where practical; adding `axe-core` as test tooling is acceptable.
- `critical` and `serious` axe violations are CI-blocking. Lower-severity findings must either be fixed or explicitly documented with a narrow rationale; no blanket allowlist is permitted.
- Keyboard tests assert actual focus movement/order and activation, not merely the presence of `tabindex` attributes.
- Canonical primitives must have an accessible name when their semantics require one.

## Requirements

1. Build a reusable test helper that mounts a component/host state and runs axe after Angular stabilizes.
2. Add accessibility coverage for Button/IconButton, text/textarea/select/search fields, selection controls, Dialog/Overlay/ActionCard, page state, progress/loading, collection/molecule cards when interactive, pagination, tabs/disclosures and toast/status output.
3. Add keyboard tests for Tab/Shift+Tab, Enter/Space, Escape and arrow-key patterns where applicable.
4. Verify focus trap/restore for dialogs and deterministic focus order for critical form/action flows.
5. Assert live-region/error/status semantics for asynchronous feedback and validation.
6. Add regression tests for at least one known bad accessible-name/focus/live-region fixture and prove the suite detects it.
7. Register the suite in the canonical CI aggregate.

## Acceptance criteria

- [ ] Every canonical interactive primitive has automated accessibility coverage.
- [ ] Critical representative composed flows have axe coverage after rendering/stabilization.
- [ ] No `critical` or `serious` axe violation remains in the covered scope.
- [ ] Keyboard navigation and activation patterns are explicitly tested.
- [ ] Dialog focus trap and focus restoration are deterministic and tested.
- [ ] Live validation/status/toast feedback has tested accessible semantics.
- [ ] Accessibility tests run automatically through the same `ci:check` used by autonomous preflight and GitHub Actions.

## Validation

```text
npm ci
npm run ci:check
```

Run the accessibility suite directly and prove negative fixtures fail before removing/isolating them as intentional test fixtures.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`:

1. keyboard-only navigate representative login/form, search, dialog/action and collection-selection flows;
2. inspect accessibility tree/name/role/state for the changed primitives;
3. verify visible focus is never lost or trapped outside the intended dialog;
4. verify Escape/restore-focus behaviour;
5. inspect live error/status announcements where DevTools exposes the relevant accessibility state.

## Stop conditions

Mark `BLOCKED` if an accessibility correction requires an unresolved product interaction decision, if a critical flow cannot be exercised with available deterministic test data, or if the full CI baseline cannot be restored.

## Dependencies

- `0059-create-the-canonical-button-primitive.md` through `0076-move-toast-contracts-to-a-neutral-ui-model.md` must be `DONE` first.
- `0082-make-invalid-css-and-tailwind-utilities-fail-ci.md` must be `DONE` first.

## Implementation notes

Keep the helper framework-agnostic enough that later catalog/visual tests can reuse fixtures/state builders, but do not delay this task waiting for task `0086`.

## Execution notes

> Current status (2026-09-17): DONE locally; awaiting exact feature-SHA CI
> and integration by the coordinator. The prior
> dependency skip as stale after direct owner re-enablement of its prerequisite
> chain; historical skip evidence below is retained only for traceability.

### Feature branch
`feature/UI-025`

### Preflight
- Confirmed clean `feature/UI-025` at certified `develop` base
  `4bfcdf0ff3a34308bd02860985fb9f1c710e959c`; local
  `commit.gpgSign=false`.
- Chrome DevTools MCP `list_pages` capability probe succeeded without
  navigation.
- Started Tox21, Nest and Angular in the required order; two consecutive
  `http://localhost:8888/health` and `/` rounds returned 200. Nest compiled
  with zero errors and Angular completed its development build.
- Opened `http://localhost:8888/login` and confirmed the login form,
  accessible names, and polite live region through the Chrome accessibility
  snapshot. No protected state was required for this fixture-only validation.
- Stopped all task-owned runtime processes before implementation.

### Preflight remediation
_None._

### Summary
Added an axe-core helper with critical/serious-only reporting, a deterministic
canonical primitive fixture covering interactive semantics, keyboard behavior,
dialog focus restoration, live feedback, and a negative unnamed-button fixture.
Registered the focused accessibility command in the Angular test setup and the
canonical `ci:check` aggregate.

### Task-specific validation performed
- `npm install --workspace mercurion_web_ng --save-dev axe-core@4.11.0
  --ignore-scripts` completed successfully; `package-lock.json` records the
  dependency.
- `npm run test:accessibility --workspace mercurion_web_ng`: 6 tests passed in
  ChromeHeadless, including the axe composition check, deterministic keyboard
  order, dialog Escape/focus restoration, tabs/disclosure/combobox keyboard
  behavior, live-region semantics, and the failing unnamed-button fixture.
- `npm run typecheck --workspace mercurion_web_ng`: passed.
- `npm run lint:angular --workspace mercurion_web_ng`: passed.
- Direct affected regression command
  `ng test --watch=false --karma-config=karma.conf.js
  --include=src/app/components/common/tabs/tabs.component.spec.ts`: 11 tests
  passed.
- `git diff --check`: passed after documentation cleanup.
- The focused suite initially exposed a real tabs roving-focus defect
  (`event.currentTarget` was read after dispatch); capturing the tablist before
  the microtask fixed it without suppressing the regression.

### Full pre-merge CI-parity validation
Not run locally; reserved for exact feature-SHA CI.

### Browser validation performed
Post-implementation: restarted Tox21, Nest and Angular in the required order,
then obtained two consecutive successful 200 responses from
`http://localhost:8888/health` and `http://localhost:8888/`. Through Chrome
DevTools MCP at `http://localhost:8888/login`, the accessibility snapshot
verified the named required email textbox, login form, disabled submit state,
remember-me switch, named recovery/provider links and polite live regions.
Keyboard-only Tab traversal visibly focused the home link, search control,
theme control, and required email textbox in order. No protected state was
needed for the changed fixture/test behavior, so no credentials were entered.
All task-owned runtime processes were stopped afterward.

### Commits
Pending task-specific commit.

### Merge / CI
Coordinator-owned; exact feature-SHA CI is required before merge.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
