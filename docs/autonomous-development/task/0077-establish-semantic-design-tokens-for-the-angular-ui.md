# 0077 - Establish semantic design tokens for the Angular UI

- [ ] DONE
- [ ] BLOCKED

## Objective

Create one semantic design-token system for Angular colors, spacing, radii, shadows and typography, then migrate production UI code so reusable visual decisions come from those tokens instead of local arbitrary values.

Source: `UI-019` in Series `0001`.

## Context

`MercurionWebNg/tailwind.config.js` already contains a partial theme for light/dark colors, one custom `btn-dark` shadow and the Space Grotesk font, but production templates and `src/styles.css` still contain many local Tailwind combinations, arbitrary bracket values, literal colors and bespoke visual constants. The canonical primitives created by tasks `0059`-`0076` must become the primary consumers of the design system rather than defining their own visual language.

For this task, a "raw value" means an arbitrary visual literal such as hex/rgb color, ad-hoc pixel/rem value, arbitrary Tailwind bracket value, bespoke shadow/radius/font-size or duplicated visual constant. Normal structural layout utilities that resolve to the configured Tailwind scale may remain when they are not part of a reusable component contract.

## Relevant files and modules

- `MercurionWebNg/tailwind.config.js`
- `MercurionWebNg/src/styles.css`
- `MercurionWebNg/src/app/components/common/`
- `MercurionWebNg/src/app/components/action-components/`
- `MercurionWebNg/src/app/pages/`

## In scope

- Define a documented semantic token taxonomy for color, spacing, radius, shadow and typography.
- Keep Tailwind as the styling engine and make its theme the canonical compile-time token source; CSS custom properties may be used only where runtime theme/state requires them.
- Map light and dark theme values to the same semantic names.
- Migrate canonical primitives and production callers away from arbitrary visual literals.
- Add a deterministic source check that rejects new unapproved raw visual literals and register it in the canonical CI aggregate.
- Maintain an explicit, minimal allowlist for genuine assets or third-party values that cannot be tokenized.

## Out of scope

- Do not redesign Mercurion or intentionally change its visual identity.
- Do not introduce a second styling framework or design-system dependency.
- Do not modify email-template styling; this task concerns the Angular application.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Existing appearance is the migration baseline; tokenization must preserve it unless a later task explicitly changes a value for accessibility.
- Semantic names describe purpose, not literal hue/size, for example surface/text/accent/control/focus rather than `blue-500`.
- The token source must support both light and dark themes without callers choosing raw theme values themselves.
- Arbitrary-value exceptions must be machine-readable and justified; comments alone are not an allowlist.

## Requirements

1. Define the token families and naming convention in the Angular styling configuration/documentation.
2. Consolidate existing theme aliases and remove duplicate equivalents where one semantic token is sufficient.
3. Express reusable component spacing, radii, shadows and typography through named theme entries instead of repeated arbitrary literals.
4. Update the canonical UI primitives first, then migrate production pages/components that still encode the same visual decisions locally.
5. Add a deterministic `ui:tokens:check`-style gate or equivalent that scans relevant Angular source/style configuration and fails on disallowed raw values.
6. Register the new gate in the root `ci:check` aggregate established by task `0008`.
7. Document any retained exception with path, value/pattern and reason.

## Acceptance criteria

- [ ] One semantic token taxonomy covers colors, spacing, radii, shadows and typography used by production Angular UI.
- [ ] Light/dark variants are paired by semantic role rather than exposed as ad-hoc caller choices.
- [ ] Canonical primitives consume semantic tokens and do not embed arbitrary visual literals for their reusable contract.
- [ ] Production Angular source contains no unapproved raw visual literals in the governed categories.
- [ ] A deterministic token-usage gate fails CI when a disallowed raw visual literal is introduced.
- [ ] Approved exceptions are explicit, minimal and documented.
- [ ] Existing behaviour and visual identity not targeted by this task remain compatible.

## Validation

```text
npm ci
npm run ci:check
```

Additionally run the new token-specific gate directly and prove it fails against at least one temporary fixture containing a forbidden raw visual value before removing the fixture.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`:

1. inspect representative auth, dashboard, search, collection and action-overlay views;
2. verify both light and dark themes;
3. compare typography, spacing, radius and shadow behaviour before/after migration where practical;
4. verify responsive layouts at desktop and narrow mobile widths;
5. confirm no relevant console/runtime styling errors.

## Stop conditions

Mark `BLOCKED` rather than guessing if preserving the current appearance requires an unresolved product/design decision, if a token migration would knowingly alter application semantics, or if the mandatory preflight/full CI-parity suite cannot be restored to green.

## Dependencies

- `0059-create-canonical-button-primitive.md` through `0076-move-toast-contracts-to-a-neutral-ui-model.md` must be `DONE` first.

## Implementation notes

Prefer a small semantic layer over a huge token matrix. The goal is a stable public styling contract for components, not a one-to-one rename of every Tailwind utility.

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
