# 0073 - Unify molecule summary cards with a discriminated view model

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Create one canonical molecule summary-card presentation driven by a discriminated view model so saved molecule items, search results and related variants configure metadata/actions instead of forking card markup.

Source: `UI-015` in Series `0001`.

## Context

Molecule presentation is spread across molecule collection item cards, selectable variants, search-overlay results/saved items, similar-item views and related card components. The audit found divergence in actions and metadata despite representing the same core molecule summary concept.

## Relevant files and modules

- `MercurionWebNg/src/app/components/molecule-detail/molecule-collection-item-card/`
- `.../molecule-collection-item-select-card/`
- `.../skeleton-molecule-card/`
- search overlay result rendering
- similar molecule components
- molecule search/collection models and view models
- canonical interaction/Button/selection primitives

## In scope

- Define a discriminated immutable molecule-summary view model for current source variants.
- Implement one canonical card presentation.
- Configure optional badges/metadata/actions through the view-model variant or explicit slots.
- Support selectable usage without cloning presentation.
- Migrate search, saved-item and compatible related-molecule consumers.
- Align molecule skeleton geometry.
- Add component/integration tests.

## Out of scope

- Molecule-detail full page.
- Domain fetching/mutations and chemistry calculations.
- Collection-card presentation (`0072`).

## Decisions already made

- API/GraphQL transport entities are adapted to UI view models and are not polluted with card state.
- Variant discrimination represents real domain/source differences; visual one-offs do not create new variants.
- Action controls are explicit and semantic; the card does not import feature services.
- Selectable state composes canonical selection behaviour.

## Requirements

1. Inventory molecule card/search-result variants and the metadata/actions each actually needs.
2. Define a discriminated view model covering saved/custom/search/external variants required by current UI without `any` casts.
3. Implement one canonical summary card with shared identity, structure/thumbnail, primary metadata and badge regions.
4. Model optional actions as explicit slots/configuration while preserving correct link/button semantics.
5. Support selectable mode through composition rather than a forked template.
6. Migrate compatible search-overlay, collection and related-molecule consumers.
7. Remove redundant molecule-card markup/components when no consumers remain.
8. Update canonical molecule skeleton to match final card geometry.
9. Add tests for each discriminant variant, action configuration and selectable state.

## Acceptance criteria

- [ ] One canonical molecule summary-card presentation covers current compatible variants.
- [ ] A discriminated typed view model replaces markup forks/unsafe shape assumptions.
- [ ] API/GraphQL transport models remain free of UI-only card state.
- [ ] Actions/badges are configuration/slots rather than duplicated templates.
- [ ] Search and saved-item views render consistently without losing required metadata.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run card/view-model tests and representative search/collection integration tests, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, inspect at least one search result, saved molecule card and selectable card. Verify metadata/badges/actions, keyboard interaction, mobile/desktop, skeleton transition and light/dark appearance.

## Stop conditions

Mark `BLOCKED` if two variants have materially incompatible product interaction semantics that cannot be represented as explicit actions/slots without an unresolved UX decision. Do not create a catch-all boolean matrix.

## Dependencies

- `0066-create-the-canonical-selection-control-primitive.md`
- `0067-normalize-interactive-element-semantics.md`
- `0071-consolidate-progress-indicators-and-skeletons.md`

## Implementation notes

Keep the discriminant meaningful (`source`/`kind`) and require exhaustive rendering at compile time. Avoid a bag of optional properties with runtime probing.

## Execution notes

### Feature branch
No task branch or worker was created because hard prerequisites `0066`
(`UI-008`), `0067` (`UI-009`), and `0071` (`UI-013`) are terminal
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. All direct selection,
interaction, and skeleton prerequisites are `SKIPPED_DEPENDENCY`, with
transitive blocked root cause
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
No implementation blocker. Re-enable only after the direct prerequisite chains
are deliberately resolved in a new authorized session.