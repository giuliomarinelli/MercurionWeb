# 0078 - Validate semantic colors and WCAG contrast in both themes

- [x] DONE
- [ ] BLOCKED
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

- [x] Every Angular semantic color token is syntactically valid.
- [x] No production Angular caller uses an unapproved hard-coded color where a semantic token exists.
- [x] `219C6F` and any equivalent malformed values are absent.
- [x] Supported light-theme foreground/background combinations pass automated WCAG AA checks.
- [x] Supported dark-theme foreground/background combinations pass automated WCAG AA checks.
- [x] The color/contrast test fails deterministically for a temporary malformed token and a temporary insufficient-contrast fixture.
- [x] Existing product appearance is preserved except where a contrast correction is required by the task.

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

Authorized recovery of `feature/UI-020`, preserved at
`3ca7e172c52c8d51652851a07022e1f6c1d8f6fd`, against current `develop`
`33a83f04e98baeff46b983ebee8a2e9e58530557`.

### Preflight

- Exact base-SHA full CI run `34910526680` succeeded for current `develop`,
  including Windows, Ubuntu and `Required gate`.
- The isolated npm install capability probe succeeded and its exact temporary
  directory was removed; repository status remained clean.
- Current `develop` was merged into the preserved feature branch with
  `--no-ff --no-gpg-sign` as commit `0049f61efdc9b3b4204c627c5f2b919f1fcaf8f9`.
- The only merge conflict was the root `ci:static` script; the resolution
  preserved every current gate and registered `ui:colors:check`.

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
- Angular typecheck and build passed.
- `git diff --check` passed.

### Browser validation performed

- Runtime startup followed Tox21 -> Nest -> Angular and reached two consecutive
  successful `/health` and `/` readiness rounds through
  `http://localhost:8888`.
- By direct owner authorization, the ChatGPT Chrome extension controlled the
  local browser in place of the unavailable Chrome DevTools transport. The
  owner completed the ordinary local test-account login without exposing
  credentials to the agent.
- The authenticated dashboard exposed the protected identity and workspace
  counts. Authenticated `/settings` then exercised representative text,
  buttons, semantic surfaces, profile fields, select state, disabled actions,
  the profile dialog, a required-field error and keyboard focus-visible rings.
- Light and dark themes were selected explicitly. Rendered UI and computed
  semantic values matched each theme, including light border `#6b7280`, dark
  border `#9ca3af`, light focus `#6366f1` and dark focus `#bfdbfe`.
- The temporary invalid field state was cancelled without saving. No
  error-level browser console entries were present; unrelated development
  warnings remained visible.
- All three task-owned runtime sessions were stopped and ports `3498` and
  `8099` had no remaining listener.

### Commits

Implementation commit `3ca7e172c52c8d51652851a07022e1f6c1d8f6fd` and
authorized recovery merge `0049f61efdc9b3b4204c627c5f2b919f1fcaf8f9`.

### Full pre-merge CI-parity validation

Exact feature-SHA GitHub Actions is pending. Local `npm ci` and
`npm run ci:check` were not run by policy.

### Merge / CI

Pending exact feature-SHA and post-merge CI.

### Rollback

If post-merge CI is not successful and verifiable, revert the merge commit and
record `REVERTED` according to the integration lifecycle.
