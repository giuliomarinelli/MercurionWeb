# 0089 - Decompose add-molecules-to-collection into reusable flow units

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Turn `AddMoleculesToCollectionComponent` into a thin orchestrator by separating search, result paging, selection/chips and submit behavior into independently testable units, without prematurely duplicating the later canonical collection-picker extraction.

Source: `NG-003` in Series `0001`.

## Context

The current component extends `AbstractPaginatedMultiselectComponent<MoleculeCardItemModel>` and combines search, pagination, selection and action submission in one feature. Later tasks `0100`/`0101` will extract the cross-action collection-picker and naming/selection helpers, while `0102` removes pagination inheritance. This task should therefore establish clean seams and local responsibilities that those later tasks can reuse rather than building competing abstractions.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/add-molecules-to-collection/add-molecules-to-collection.component.ts`
- its focused spec
- `MercurionWebNg/src/app/abstract/abstract-paginated-multiselect-component.ts`
- `MercurionWebNg/src/app/abstract/abstract-pagination-component.ts`
- molecule search/collection-item services and models
- search field, molecule card, pagination and action-footer primitives from the UI series

## In scope

- Extract search query/state from the action component.
- Extract selection state and chip/list presentation from the action component.
- Extract submit command/result handling behind a feature-local facade/controller.
- Keep pagination behavior behind an explicit interface so task `0102` can replace inheritance cleanly.
- Make the action component compose the common action shell and feature units only.
- Add unit tests for query transitions, selection transitions and submit behavior.

## Out of scope

- Do not yet create the final reusable collection-picker module owned by `0100`.
- Do not create the final shared naming/collision helper owned by `0101`.
- Do not redesign GraphQL cache policy; later NG tasks own that concern.
- Do not alter backend collection semantics.

## Decisions already made

- Search, paging, selection and submit are separate concerns.
- The action must not depend on inherited mutable UI lifecycle state in its final architecture; this task may leave the actual base-class removal to `0102` but must not deepen that dependency.
- Existing canonical UI primitives must be reused.

## Requirements

1. Define a feature state/view model that represents query, page state, selected molecules, pending/error and submit result explicitly.
2. Keep search debounce/concurrency policy outside presentational components.
3. Ensure selection is identity-based and stable across pagination/search refresh.
4. Ensure cancel/close tears down pending work and selection state.
5. Keep submit payload creation isolated and covered by tests.
6. Avoid direct duplication of picker logic that will be generalized in `0100`.

## Acceptance criteria

- [ ] The action component is a thin composition/orchestration layer.
- [ ] Search, pagination, selection and submit logic are independently testable.
- [ ] Selection survives intended page/query transitions without stale duplicates.
- [ ] Close/reopen starts with clean state.
- [ ] Existing add-to-collection behavior remains compatible.

## Validation

Run focused tests for the extracted feature units and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open the action from a reachable flow, search molecules, page/load more, select/deselect across result changes, submit where local data permits, cancel/reopen, and verify pending/error/empty states plus console/network behavior.

## Stop conditions

Mark `BLOCKED` if current selection identity or submit semantics cannot be determined from existing code/contracts without a product decision.

## Dependencies

- Canonical search/card/pagination/action primitives from UI tasks must be available.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
Not attempted because the required canonical search/card/pagination/action
primitives from the UI tasks are terminally unavailable.

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
Required UI primitives include tasks in the UI-001 through UI-016 chain,
which are `SKIPPED_DEPENDENCY` because FE-030 is `BLOCKED`. FE-030 requires
filesystem-write capability for a fresh, human-authorized worker session.
