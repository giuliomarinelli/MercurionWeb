# 0106 - Lazy-load actions from one typed overlay registry

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace eager action-component imports and parallel string switches in `ActionOverlayComponent` with one exhaustive typed registry that owns lazy component loading, accessible metadata, input and result contracts.

Source: `NG-020` in Series `0001`.

## Context

The current overlay eagerly imports all nine action components, lists them in `imports`, switches on `ctx.scope()` to render them and performs a second switch over the same string values to derive dialog labels. Earlier tasks establish an explicit overlay state machine, isolated action sessions and canonical dialog shell; this task removes the remaining central eager coupling.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/action-overlay/action-overlay.component.ts`
- `MercurionWebNg/src/app/Models/action/action-overlay.models.ts`
- `ActionOverlayContextService` / action-session contracts from `FE-023` and `FE-036`
- action components under `components/action-components/`
- canonical dialog/overlay primitive from `UI-010`

## In scope

- Define a compile-time exhaustive registry keyed by the canonical action scope union.
- Store lazy loader, accessible title/label and typed input/result contract metadata in that registry.
- Resolve/render the selected standalone action dynamically/lazily through Angular-supported APIs.
- Remove eager imports of individual action implementations from the overlay host.
- Make adding a new action require one registry entry rather than edits to multiple switches.
- Add compile-time/runtime tests for registry completeness, loading failure, session isolation and lazy chunking.

## Out of scope

- Do not reimplement the state machine from `FE-023` or dialog behavior from `UI-010`.
- Do not use untyped `string -> any` maps.
- Do not eagerly preload every action immediately after boot merely to preserve old behavior.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Action scope is a closed typed union and the registry must be exhaustive.
- The registry is the single authority for implementation loader and action metadata.
- Input/result types belong to action contracts, not to component implementation classes.
- Failed lazy loading is a typed overlay error state, not an uncaught runtime exception.

## Requirements

1. Introduce an `ActionDefinition`/equivalent generic registry contract connecting scope, input, result, label and lazy loader.
2. Make TypeScript fail when a scope is missing or mapped incompatibly.
3. Remove the action implementation imports and both central scope switches from `ActionOverlayComponent`.
4. Render the loaded standalone component inside the existing canonical dialog/session lifecycle.
5. Ensure opening a different action cannot reuse the previous implementation/input/result state.
6. Add build/chunk assertions proving action implementations are not all included in the eager overlay chunk.

## Acceptance criteria

- [ ] The overlay host has no eager imports of individual action implementations.
- [ ] One typed exhaustive registry owns scope-to-loader and metadata mapping.
- [ ] Adding/removing a scope causes a compile-time failure until the registry is updated.
- [ ] Action input/result contracts remain typed end-to-end.
- [ ] Lazy-load failure produces a controlled overlay error/close path.
- [ ] Production build demonstrates action code splitting.

## Validation

Run registry/overlay focused tests, production build/chunk inspection and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open every reachable action type at least once, close/reopen different actions in rapid succession, verify labels/focus/result behavior, and inspect Network/Sources to confirm action chunks load on demand without console errors.

## Stop conditions

Mark `BLOCKED` if an action still depends on undocumented global mutable payload outside the approved action-session contract and cannot be migrated without a product decision.

## Dependencies

- `FE-023`, `FE-036` and `UI-010` must be `DONE`.
- Relevant action decomposition tasks from `0087` onward should be respected rather than bypassed.

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
