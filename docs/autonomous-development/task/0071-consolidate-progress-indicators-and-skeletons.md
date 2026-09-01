# 0071 - Consolidate progress indicators and skeletons

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace coexisting legacy/new spinners and ad-hoc skeletons with one canonical progress-indicator and skeleton system whose geometry matches final content and whose motion respects user preferences.

Source: `UI-013` in Series `0001`.

## Context

The repository contains `classic-spinner` plus multiple skeleton implementations such as `skeleton-card-loader`, `skeleton-molecule-card` and search-result skeleton loaders. The audit found that legacy/new loading components coexist and skeleton geometry does not always correspond to the final content layout, creating visual shift and inconsistent motion.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/classic-spinner/`
- `MercurionWebNg/src/app/components/common/skeleton-card-loader/`
- `MercurionWebNg/src/app/components/molecule-detail/skeleton-molecule-card/`
- search-result skeleton loader components
- other spinner/skeleton usages in Angular
- page/section state primitive from `0070`

## In scope

- Define a canonical progress-indicator API for indeterminate activity.
- Define reusable skeleton primitives/tokens for shape, size and motion.
- Make feature skeleton compositions match the geometry of final content closely enough to avoid avoidable layout shifts.
- Respect `prefers-reduced-motion`.
- Migrate legacy spinner/skeleton consumers and remove superseded components/styles.
- Add component/visual-state tests where practical.

## Out of scope

- Async state ownership (`0070`).
- Rewriting final collection/molecule card content (`0072`/`0073`), except adapting skeleton geometry to canonical cards when those dependencies are available.
- Performance instrumentation beyond loading UI itself.

## Decisions already made

- Spinner/progress and skeleton are different presentation modes under one design-system family.
- Skeleton motion must stop/reduce when the OS/browser requests reduced motion.
- Skeleton dimensions should model final content rather than generic rectangles chosen per feature.
- Feature code chooses whether loading is best represented by progress or a skeleton; visual implementation remains canonical.

## Requirements

1. Inventory all spinner and skeleton components/usages and identify duplicates/legacy variants.
2. Implement canonical progress indicator sizes/labels and accessible busy semantics.
3. Implement skeleton primitives for text/shape/card composition with deterministic dimensions.
4. Add reduced-motion CSS/logic with no required animation for comprehension.
5. Align collection/molecule/search skeleton compositions to their final layout.
6. Migrate existing usages and delete dead legacy components/styles.
7. Verify loading UI does not cause significant avoidable layout shift when content replaces it.
8. Add tests for sizes, accessible labels/busy state and reduced-motion class/behaviour.

## Acceptance criteria

- [ ] One canonical progress-indicator family remains.
- [ ] Skeleton primitives are canonical and feature skeletons compose them.
- [ ] Legacy spinner/skeleton implementations are removed when no longer used.
- [ ] Skeleton geometry tracks corresponding content layout.
- [ ] Reduced-motion preference is respected.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused progress/skeleton tests, static search for superseded components, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, inspect representative loading states for search, collection and molecule content at desktop/mobile widths. Compare skeleton-to-content geometry, verify reduced-motion emulation, light/dark theme and accessibility status.

## Stop conditions

Mark `BLOCKED` if a feature's final layout is itself being replaced by a pending canonical-card task and accurate skeleton geometry cannot be established independently. Prefer depending on the canonical card rather than locking in obsolete geometry.

## Dependencies

- `0070-create-the-canonical-page-and-section-state-primitive.md`

## Implementation notes

When practical, share layout tokens/dimensions with the final component rather than copying hard-coded skeleton measurements into an unrelated file.

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