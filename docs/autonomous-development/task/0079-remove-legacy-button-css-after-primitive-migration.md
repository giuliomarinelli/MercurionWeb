# 0079 - Remove legacy button CSS after primitive migration

- [ ] DONE
- [ ] BLOCKED

## Objective

Delete deprecated button aliases and obsolete button-specific CSS after the canonical button primitives have absorbed their callers, leaving no dead compatibility layer in Angular source or the generated CSS bundle.

Source: `UI-021` in Series `0001`.

## Context

`MercurionWebNg/src/styles.css` still contains a clearly marked deprecated button section with `.btn`, `.btn-accent-primary`, outline/hover variants, size aliases, `.btn-disabled`, `.btn-pill`, plus local `.green-btn` and `.red-btn` rules. Earlier UI tasks create canonical `Button`, `IconButton`, `ActionFooter` and action-card primitives; this task removes the legacy CSS only after those migrations are complete.

## Relevant files and modules

- `MercurionWebNg/src/styles.css`
- canonical Button/IconButton/ActionFooter/action-card primitives
- production Angular templates and inline templates
- Angular build output

## In scope

- Find every remaining production use of deprecated button CSS aliases.
- Migrate residual callers to the canonical typed primitives or their legitimate non-button semantic primitive.
- Delete deprecated `.btn*`, `.green-btn`, `.red-btn` and equivalent obsolete button aliases once unused.
- Remove shadow/theme aliases that exist solely for deleted button CSS when they have no other consumer.
- Add/extend a deterministic source check preventing reintroduction of deleted legacy classes.
- Verify generated CSS no longer contains dead legacy button selectors.

## Out of scope

- Do not change email-template `.btn-*` CSS; backend notification emails are a separate rendering domain.
- Do not redesign the canonical button API created by earlier tasks unless a concrete migration blocker proves an omission.
- Do not remove generic classes that merely contain the substring `btn` but have a valid non-legacy semantic role.
- Do not modify `../MercurionTox21`.

## Decisions already made

- No backward-compatibility alias is retained after all Angular callers migrate.
- Canonical primitives, not global CSS utility aliases, own button variants and state.
- Source and generated bundle must both prove removal; an unused selector left in `styles.css` is still technical debt.

## Requirements

1. Inventory legacy button class definitions and all Angular consumers.
2. Migrate each real caller to the canonical component/variant API.
3. Delete the deprecated global button block and any equivalent dead rules.
4. Remove token/config entries used only by deleted legacy classes if they are genuinely unreferenced.
5. Extend the static UI/style gate so deleted class names cannot reappear in Angular application source.
6. Build production CSS and verify the deleted selectors are absent from emitted assets.

## Acceptance criteria

- [ ] No production Angular template uses deprecated button classes.
- [ ] No deprecated `.btn*`, `.green-btn`, `.red-btn` compatibility selector remains in Angular global/component CSS.
- [ ] Canonical button/action primitives cover every migrated interaction without visual or behavioural regression.
- [ ] Dead token/shadow entries used solely by legacy button CSS are removed.
- [ ] A deterministic check blocks reintroduction of the deleted Angular legacy aliases.
- [ ] Production CSS output does not contain the removed selectors.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

```text
npm ci
npm run ci:check
```

Additionally run the Angular production build and inspect/search emitted CSS for the exact deleted selector names.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`, exercise representative primary, secondary, destructive, icon-only, disabled, loading and action-footer buttons in light/dark themes and desktop/mobile layouts. Confirm keyboard/focus behaviour and that no style disappears after legacy CSS removal.

## Stop conditions

Mark `BLOCKED` if a remaining legacy class represents a product state not expressible by the approved canonical primitive and choosing its replacement requires a new design/product decision, or if CI cannot be restored to green.

## Dependencies

- `0059-create-the-canonical-button-primitive.md` must be `DONE` first.
- `0060-create-the-accessible-iconbutton-primitive.md` must be `DONE` first.
- `0061-create-the-canonical-actionfooter-primitive.md` must be `DONE` first.
- `0069-create-the-canonical-actioncard-shell.md` must be `DONE` first.
- `0077-establish-semantic-design-tokens-for-the-angular-ui.md` must be `DONE` first.

## Implementation notes

Search backend email templates separately so similarly named email CSS is not accidentally treated as Angular dead code.

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
