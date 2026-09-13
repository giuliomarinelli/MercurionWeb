# 0078 - Validate semantic colors and WCAG contrast in both themes

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Normalize every Angular color token into a syntactically valid semantic palette and add deterministic contrast validation for light and dark themes so invalid or inaccessible theme values cannot enter CI.

Source: `UI-020` in Series `0001`.

## Context

The audited `MercurionWebNg/tailwind.config.js` contains duplicated/hard-coded color decisions and at least one syntactically invalid value: `dark.accent-secondary-surface` is `219C6F` without the required `#`. Angular templates/styles also contain literal colors outside the theme. Task `0077` establishes the semantic token surface that this task must validate rather than creating a competing palette.

## Relevant files and modules

- `MercurionWebNg/tailwind.config.js`
- semantic token configuration introduced by `0077`
- `MercurionWebNg/src/styles.css`
- canonical UI primitives under `MercurionWebNg/src/app/components/`
- root CI/check scripts

## In scope

- Correct malformed color values, including `219C6F`.
- Consolidate equivalent/duplicated theme colors into semantic tokens from `0077`.
- Eliminate unapproved literal Angular UI colors outside the canonical token source.
- Add deterministic syntax validation for every supported color token.
- Add automated contrast tests for semantically defined foreground/background and control/focus combinations in both themes.
- Register the color/contrast gate in `ci:check`.

## Out of scope

- Do not redesign brand colors merely for aesthetic preference.
- Do not apply this Angular palette to backend email HTML or external assets.
- Do not accept inaccessible combinations by weakening the checker.
- Do not modify `../MercurionTox21`.

## Decisions already made

- WCAG AA is the minimum automated target: at least 4.5:1 for normal text and 3:1 for large text and relevant non-text UI/focus boundaries where the WCAG criterion applies.
- Contrast tests operate on semantic combinations actually supported by the design system, not on the Cartesian product of every palette color.
- If an existing brand combination cannot meet the required contrast without a visible product/design change, stop and request a human decision rather than silently choosing a new brand color.

## Requirements

1. Parse/validate every color token supported by the Angular design system; malformed values must fail the test before Tailwind build output is trusted.
2. Fix `accent-secondary-surface` and any other malformed token discovered by the scan.
3. Define the supported semantic foreground/background pairings for light and dark themes in one testable registry.
4. Compute contrast deterministically from the resolved color values and assert the applicable WCAG AA threshold.
5. Cover text, interactive control labels, error/warning/success states, disabled state when applicable, borders/focus indicators and overlay/dialog surfaces.
6. Remove duplicated literal aliases when their semantic role is already represented by an existing token.
7. Add the validator to the canonical local/CI aggregate.

## Acceptance criteria

- [ ] Every Angular semantic color token is syntactically valid.
- [ ] No production Angular caller uses an unapproved hard-coded color where a semantic token exists.
- [ ] `219C6F` and any equivalent malformed values are absent.
- [ ] Supported light-theme foreground/background combinations pass automated WCAG AA checks.
- [ ] Supported dark-theme foreground/background combinations pass automated WCAG AA checks.
- [ ] The color/contrast test fails deterministically for a temporary malformed token and a temporary insufficient-contrast fixture.
- [ ] Existing product appearance is preserved except where a contrast correction is required by the task.

## Validation

```text
npm ci
npm run ci:check
```

Run the color/contrast gate directly and demonstrate negative fixtures for malformed syntax and insufficient contrast before removing those fixtures.

## Browser validation

Using Chrome DevTools MCP at `http://localhost:8888`:

1. exercise representative text, button, field, dialog, toast/error and selection states;
2. repeat in light and dark themes;
3. inspect focus-visible states and error/warning/success treatment;
4. verify no missing Tailwind classes or theme regressions are visible;
5. verify no relevant console errors.

## Stop conditions

Mark `BLOCKED` if meeting WCAG AA requires an unresolved brand/design decision, if a semantic pairing cannot be determined from existing product behaviour, or if CI/preflight cannot be restored to green.

## Dependencies

- `0077-establish-semantic-design-tokens-for-the-angular-ui.md` must be `DONE` first.

## Implementation notes

Keep the contrast implementation dependency-light. A small deterministic utility/test is preferable to introducing a large runtime package solely for build-time contrast mathematics.

## Execution notes

### Feature branch

`feature/UI-020` from base `ee970f5acfd93f5f4d59f55dff59bc6bfbbb3b5b`.

### Preflight

- Confirmed the branch was clean and exactly at the supplied base SHA.
- Confirmed GitHub Actions run `34788533211` for the exact base SHA was
  successful, including both platform prerequisite jobs and `Required gate`.
- The focused unchanged checks `npm run ui:tokens:check` and
  `npm run ui:tokens:check:negative` passed.
- No task-owned Angular, Nest, Tox21, or test-watcher process was active before
  runtime startup.
- Canonical runtime capability startup followed the required order
  Tox21 -> Nest -> Angular. Two complete readiness rounds returned successful
  responses for `/health` and `/` through `http://localhost:8888`.
- The dedicated browser profile opened the login route and, when the protected
  dashboard was requested during preflight, exposed the protected dashboard
  identity and workspace counts. No credentials or browser storage were
  recorded.

### Summary

Added `scripts/check-angular-semantic-colors.mjs`, a dependency-light
deterministic validator that checks every light/dark Tailwind palette literal,
requires matching CSS semantic roles in both themes, computes WCAG contrast,
and validates a single registry of supported text, controls, statuses, focus,
border, and elevated-surface pairings. Added malformed-token and
insufficient-contrast negative fixtures, registered the gate in `ci:static`,
corrected `219C6F` to `#219C6F`, and raised the semantic border values used by
the focus/border contrast contract.

### Task-specific validation performed

- `npm run ui:colors:check` — passed (`12 pairings × 2 themes`).
- `npm run ui:colors:check:negative` — passed; malformed syntax and
  insufficient-contrast fixtures were rejected deterministically.
- Existing semantic-token positive and negative checks — passed.
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npm run build --workspace mercurion_web_ng` — passed; only the pre-existing
  initial bundle-budget warning was emitted.
- `git diff --check` — passed.

### Browser validation performed

- Final runtime startup again followed Tox21 -> Nest -> Angular and reached two
  consecutive successful readiness rounds through the nginx edge.
- A fresh navigation to `/dashboard` correctly required ordinary login and
  displayed `/login?redirect_to=%2Fdashboard`; the latest snapshot identified
  the email field.
- Chrome DevTools MCP could not interact with that field: both the required
  `fill_form` attempt and the permitted `fill` fallback returned
  `Failed to interact with the element ... within the configured timeout`.
  Because fresh supported login could not be completed, the required final
  protected-state light/dark and representative-control evidence was not
  claimed.
- All three task-owned runtime sessions were stopped after the failed browser
  interaction and no runtime process was carried forward.

### Blocker / human decision required

The final mandatory browser validation could not complete because the
Chrome DevTools MCP interaction timed out for the fresh login field after
canonical runtime readiness was established. The implementation and focused
local checks are preserved, but the task is marked `BLOCKED` rather than
claiming the unobserved browser acceptance criteria. A fresh worker with a
working persistent-profile MCP interaction is required to complete the
ordinary local login and repeat the declared light/dark UI evidence.

### Commits

Pending task commit; the diagnostic and coherent implementation must be
committed with `--no-gpg-sign` and the required Copilot co-author trailer
before publication.

### Full pre-merge CI-parity validation

Not run locally by policy. `npm ci` and `npm run ci:check` remain GitHub
Actions-only checks.

### Feature branch

_Not started._

### Preflight

_Not started._

### Preflight remediation

_None._

### Summary

Not attempted because required task 0077 (UI-019) is
`SKIPPED_DEPENDENCY`.

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

Direct terminal prerequisite: 0077 (UI-019), `SKIPPED_DEPENDENCY`.
Transitive chain: UI-020 -> UI-019 -> UI-018 (BLOCKED). UI-018 requires a
test-safe local Nest runtime and dependencies for mandatory browser validation.
