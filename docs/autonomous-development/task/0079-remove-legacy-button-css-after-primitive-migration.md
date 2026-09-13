# 0079 - Remove legacy button CSS after primitive migration

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

> Current status (2026-09-11): PENDING by direct owner instruction because this
> activity was not completed. Historical attempt/skip evidence remains below
> for traceability and is not a terminal outcome.

### Feature branch
`feature/UI-021` at base `95df8824f5d91cf3b5820cbe4bbe433f21710547`.

### Preflight
Clean `feature/UI-021` verified at the supplied base SHA. Exact baseline
GitHub Actions run `34789457123` was green, including both platform jobs and
the Required gate. No task-owned workspace process was running before the
implementation.

### Preflight remediation
The canonical runtime was started after implementation for acceptance evidence
in the required order: Tox21, Nest, Angular. Initial edge probes returned
retryable 502 responses while upstreams compiled; two consecutive complete
health/application rounds then returned HTTP 200.

### Summary
Migrated the remaining MFA and settings action buttons from `green-btn` and
`red-btn` to the canonical `m-button` variants. Removed the deprecated global
`.btn*`, `.green-btn`, and `.red-btn` CSS block. Added the deterministic
`ui:legacy-buttons:check` source gate and wired it into `ci:static`.

### Task-specific validation performed
- `npm run ui:legacy-buttons:check` — passed.
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npm run lint:angular --workspace mercurion_web_ng` — passed.
- `npm run build --workspace mercurion_web_ng` — passed (Angular reported the
  existing initial-bundle budget warning).
- Production CSS search over `MercurionWebNg/dist/mercurion-web-ng/**/*.css`
  confirmed all removed selectors are absent.
- Local browser validation through `http://localhost:8888` showed the
  authenticated dashboard at mobile viewport, opened the theme menu, switched
  from dark to light, and retained visible navigation/content. The dedicated
  persistent profile already held the protected test account session; the
  route guard redirected `/login` to the protected dashboard, so no
  credential entry was needed or performed.

### Full pre-merge CI-parity validation
Not run locally: `npm ci` and `npm run ci:check` are reserved for GitHub
Actions. Supplied exact base run `34789457123` was green; feature-branch CI is
owned by the coordinator after this push.

### Browser validation performed
Canonical Tox21, Nest, and Angular sessions were kept alive for the browser
probe and stopped before return. Chrome DevTools MCP used the dedicated
persistent profile and only `http://localhost:8888`; mobile dark/light theme
interaction and protected dashboard rendering were observed. Settings route
navigation was redirected back to the dashboard by the current application
guard, so no settings mutation was attempted.

### Commits
Pending task-specific implementation commit.

### Merge / CI
No merge performed. Coordinator must run exact-SHA CI for the pushed feature
commit.

### Rollback
Not applicable.

### Blocker / human decision required
None.
