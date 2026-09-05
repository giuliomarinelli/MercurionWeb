# 0080 - Make UI variant APIs typed and Tailwind-internal-free

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Replace local class-string composition and styling-class inputs with typed UI variant APIs whose callers express intent without knowing Tailwind implementation details.

Source: `UI-022` in Series `0001`.

## Context

Current Angular components expose styling internals directly. Examples include class-valued inputs in common controls and runtime Tailwind construction such as `size-${this.size}` in the legacy close button. The canonical primitives created by tasks `0059`-`0076` must instead expose closed typed contracts for variant, size, state and placement so Tailwind class generation remains internal and statically enumerable.

## Relevant files and modules

- canonical UI primitives introduced by `0059`-`0076`
- `MercurionWebNg/src/app/components/common/`
- `MercurionWebNg/src/app/components/action-components/`
- `MercurionWebNg/src/app/components/common/pm-select/`
- `MercurionWebNg/src/app/components/common/floating-input/`
- Tailwind/style configuration

## In scope

- Inventory public component inputs/parameters that accept Tailwind/CSS class strings or arrays as styling policy.
- Replace those public styling details with typed semantic unions/configuration.
- Keep class maps/composition private to primitives.
- Replace runtime-generated Tailwind class names with explicit static lookup maps or another statically enumerable mechanism.
- Normalize variant/size/icon-placement/loading/disabled/state APIs across canonical primitives where the concepts overlap.
- Add static checks preventing new public `*Class`, `classList` or equivalent styling-policy inputs on canonical primitives unless explicitly exempted for a true content/extension slot.

## Out of scope

- Do not prohibit normal static `class` attributes inside a primitive implementation.
- Do not invent arbitrary new visual variants that are not required by existing callers.
- Do not add a class-variant library solely for fashion; a typed lookup map is sufficient when simpler.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Component callers express semantic intent; they do not select light/dark Tailwind classes directly.
- Variant sets are closed TypeScript types and must be exhaustive at compile time.
- Tailwind candidates required at runtime must be statically discoverable/enumerable; string interpolation such as `size-${value}` is not accepted.
- Escape hatches for arbitrary classes are not part of the normal canonical primitive API.

## Requirements

1. Identify class-valued API surfaces on canonical/common primitives and map each to the semantic concept it currently encodes.
2. Replace each styling-policy input with typed `variant`, `size`, `tone`, `placement`, `state` or another domain-appropriate property.
3. Implement exhaustive internal mappings from typed values to static class strings/token combinations.
4. Ensure unsupported values fail TypeScript compilation rather than silently producing missing CSS.
5. Migrate all production callers and tests.
6. Add a deterministic static guard that detects new canonical primitive inputs exposing Tailwind internals.
7. Ensure the Tailwind/style validity gate from `0082` can enumerate every class used by these maps.

## Acceptance criteria

- [ ] Canonical primitive callers do not pass Tailwind class names to select ordinary variants/states.
- [ ] Variant/size/state APIs are typed closed sets with exhaustive internal handling.
- [ ] Runtime Tailwind string interpolation for canonical primitive variants is absent.
- [ ] Every required Tailwind candidate is statically enumerable and present in generated CSS.
- [ ] Production callers are migrated with equivalent behaviour and appearance.
- [ ] Static checks prevent reintroduction of styling-internal public APIs on canonical primitives.

## Validation

```text
npm ci
npm run ci:check
```

Additionally compile negative TypeScript fixtures/tests proving unsupported variants are rejected, and run the UI style/token checks directly.

## Browser validation

Using Chrome DevTools MCP at `http://localhost:8888`, exercise every supported variant/size/state of representative buttons, icon controls, fields, selections, dialogs and action components in both themes. Confirm generated styling remains present after production/Tailwind compilation.

## Stop conditions

Mark `BLOCKED` if an existing caller requires a visually distinct state whose semantic meaning cannot be determined without a design/product decision, or if CI/preflight cannot be restored to green.

## Dependencies

- `0059-create-the-canonical-button-primitive.md` through `0076-move-toast-contracts-to-a-neutral-ui-model.md` must be `DONE` first.
- `0077-establish-semantic-design-tokens-for-the-angular-ui.md` must be `DONE` first.

## Implementation notes

Prefer small readonly maps validated with `satisfies Record<Variant, string>` or equivalent exhaustive patterns. Keep styling logic co-located with the primitive that owns it.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
Not attempted. Required tasks 0059 through 0076 and task 0077 (UI-019)
are terminally non-`DONE`.

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
Direct terminal prerequisites: 0059 through 0075 are
`SKIPPED_DEPENDENCY`, 0076 (UI-018) is `BLOCKED`, and 0077 (UI-019) is
`SKIPPED_DEPENDENCY`. The prerequisite chains include FE-030 (BLOCKED,
requiring a filesystem-write-capable worker) and UI-018 (BLOCKED, requiring a
test-safe local Nest runtime for mandatory browser validation).
