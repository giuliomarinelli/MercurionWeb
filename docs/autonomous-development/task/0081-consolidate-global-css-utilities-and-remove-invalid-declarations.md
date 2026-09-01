# 0081 - Consolidate global CSS utilities and remove invalid declarations

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Reduce Angular global CSS to one valid definition per shared utility, removing duplicated selectors and declarations browsers ignore while preserving the intended cross-browser behaviour.

Source: `UI-023` in Series `0001`.

## Context

`MercurionWebNg/src/styles.css` contains duplicated and invalid global styling. The audited file defines `.drawer` twice, includes the invalid Tailwind variant `dark:dark:bg-neutral-900/75`, and declares both `scrollbar-width: thin` and invalid `scrollbar-width: 3px` on `.custom-scrollbar`. Multiple scrollbar implementations and viewport/overlay utilities also coexist. This task cleans the global utility layer; task `0082` subsequently makes invalid Tailwind/CSS constructs fail automatically.

## Relevant files and modules

- `MercurionWebNg/src/styles.css`
- Angular component styles/templates consuming global utilities
- `MercurionWebNg/tailwind.config.js`

## In scope

- Inventory globally shared drawer, scrollbar, overlay/scroll and equivalent utility selectors.
- Merge duplicate definitions when they represent one semantic utility.
- Remove invalid/ignored CSS declarations and malformed Tailwind variants.
- Normalize cross-browser scrollbar behaviour using valid Firefox and WebKit syntax.
- Remove global utilities with zero production consumers.
- Migrate callers when duplicate utilities are consolidated under one canonical name.
- Keep global CSS for genuinely global concerns; move component-owned behaviour back to the owning primitive where appropriate.

## Out of scope

- Do not perform the broader viewport/scroll ownership refactor scheduled in `0084`.
- Do not redesign scrollbar appearance or drawer behaviour beyond what is required for validity/consistency.
- Do not move backend/email CSS into Angular styling.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Firefox `scrollbar-width` may use only valid standard keywords (`auto`, `thin`, `none`); pixel width remains a WebKit pseudo-element concern where supported.
- One semantic utility must have one canonical global definition.
- Component-specific style rules do not belong in global CSS merely for convenience.
- Unknown/ignored declarations are defects, not harmless fallbacks.

## Requirements

1. Build an inventory of global utility definitions and source consumers.
2. Consolidate duplicate `.drawer` definitions into one valid rule and remove `dark:dark:bg...`.
3. Correct `.custom-scrollbar` so each browser receives valid supported properties without contradictory duplicate declarations.
4. Review other scrollbar/global utility families for duplicate semantics and consolidate them when safe.
5. Delete unused global selectors after proving they have no consumer.
6. Keep any necessary browser fallback intentionally ordered and documented where the cascade matters.
7. Run production build and browser checks after cleanup.

## Acceptance criteria

- [ ] `.drawer` and every other shared utility has one canonical definition per intentional cascade layer.
- [ ] `dark:dark:bg` is absent.
- [ ] `scrollbar-width: 3px` and other invalid standard declarations are absent.
- [ ] Scrollbar behaviour uses valid Firefox/WebKit mechanisms without contradictory duplicate values.
- [ ] No zero-consumer global utility remains in the audited scope.
- [ ] Component-owned styles are not unnecessarily retained in the global stylesheet.
- [ ] Existing drawer, overlay and scroll behaviour remains compatible.

## Validation

```text
npm ci
npm run ci:check
```

Also run the Angular production build and a deterministic search/audit for the known invalid patterns and duplicate utility names.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`:

1. open pages using drawers, action overlays and scrollable panels;
2. exercise narrow and desktop viewport widths;
3. verify custom scrollbar appearance/interaction in Chromium;
4. verify light/dark drawer styling;
5. verify no styling-related console errors or missing generated classes.

The standard-property syntax for Firefox must be proven by static validity; Chrome-only browser validation is not a substitute for using legal CSS values.

## Stop conditions

Mark `BLOCKED` if two duplicate utilities actually encode different product behaviours whose intended consolidation is ambiguous, or if mandatory CI cannot be restored to green.

## Dependencies

- `0077-establish-semantic-design-tokens-for-the-angular-ui.md` must be `DONE` first.
- `0078-validate-semantic-colors-and-wcag-contrast-in-both-themes.md` must be `DONE` first.

## Implementation notes

Do not preserve a duplicate selector merely because the cascade currently makes it work. Collapse intentional declarations into one readable rule or one explicitly documented layered override.

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
