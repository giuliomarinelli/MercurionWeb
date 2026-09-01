# 0083 - Add automated accessibility and keyboard coverage for canonical UI

- [ ] DONE
- [ ] BLOCKED

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
