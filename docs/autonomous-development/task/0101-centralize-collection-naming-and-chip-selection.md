# 0101 - Centralize collection naming, chip selection and collision handling

- [ ] DONE
- [ ] BLOCKED

## Objective

Create one typed set of domain/UI helpers for collection-name normalization/validation, duplicate-collision handling and chip/list selection behavior so every collection action applies identical rules and feedback.

Source: `NG-015` in Series `0001`.

## Context

`create-collection.component.ts` currently owns name trimming, `alreadyAdded`, `selectedChips`, add/remove/clear behavior and associated validation/feedback locally. Related collection actions repeat selection/chip/collision logic with their own state. Task `0100` creates the reusable collection-picker boundary; this task centralizes the smaller deterministic naming/selection rules that should not remain caller-specific.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/create-collection/create-collection.component.ts`
- collection action components migrated in `0100`
- canonical field/selection/chip/card primitives
- molecule collection service/models and any existing backend name constraints

## In scope

- Define pure collection-name normalization/validation helpers based on existing authoritative constraints.
- Define deterministic duplicate/collision comparison semantics used by client-side pending names and existing collections where applicable.
- Extract reusable immutable chip/list selection operations: add, remove, clear, identity comparison and duplicate prevention.
- Centralize user-facing validation/collision result codes/messages through the canonical error/message mechanism.
- Migrate collection callers to the shared helpers/state rather than implementing local variants.
- Add exhaustive unit tests for whitespace/case/duplicates/limits and selection transitions.

## Out of scope

- Do not invent new collection naming product rules not already enforced/documented by the application/backend.
- Do not hide server uniqueness/conflict errors; client validation complements but does not replace authoritative backend checks.
- Do not make a generic chip helper depend on GraphQL/Apollo or action-overlay services.
- Do not redesign the collection-picker architecture from `0100`.

## Decisions already made

- Pure normalization/validation logic is framework-light and testable without Angular rendering.
- Selection operations use stable identities and immutable updates suitable for signals/OnPush.
- Server conflict remains authoritative when race conditions make a name invalid after client validation.

## Requirements

1. Derive normalization and limits from existing backend/frontend contracts; document the chosen canonical rule in code tests.
2. Return typed validation/collision results rather than booleans plus ad-hoc strings.
3. Make duplicate detection deterministic for both pending chips and existing collection identities/names as required by current UX.
4. Ensure add/remove/clear helpers never mutate caller arrays in place.
5. Migrate create-collection and the collection-picker callers that currently implement equivalent behavior.
6. Preserve accessible error/live feedback through the canonical field/action primitives.

## Acceptance criteria

- [ ] Collection naming/normalization logic has one implementation.
- [ ] Duplicate/collision behavior is identical across migrated callers.
- [ ] Chip selection operations are shared, immutable and tested.
- [ ] Server-side conflict handling remains visible and deterministic.
- [ ] No migrated action keeps its own equivalent trim/duplicate/add/remove rule set.

## Validation

Run focused pure-helper and migrated caller tests, then canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise create/select collection flows with whitespace, duplicate names, add/remove/clear chips and backend conflict responses available locally. Verify consistent messages, focus/live feedback and no relevant console errors.

## Stop conditions

Mark `BLOCKED` if frontend and backend currently enforce materially conflicting naming rules and the authoritative product rule cannot be determined safely.

## Dependencies

- `0100` must be `DONE` for shared picker integration.
- Canonical field/selection/action primitives must be available.

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
