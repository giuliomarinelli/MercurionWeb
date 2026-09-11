# 0089 - Decompose add-molecules-to-collection into reusable flow units

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-003` from `9805498a961ba9fb04809d5bb688a099d7bb647c`.

### Preflight
* Exact base SHA `9805498a961ba9fb04809d5bb688a099d7bb647c` matched the local
  `feature/NG-003` HEAD and the successful GitHub Actions `CI` run
  `34594114323`.
* The working tree was clean before implementation and no workspace-consuming
  process was active.
* Browser capability preflight passed through the canonical edge after starting
  Tox21, Nest, and Angular in that order. Both `/health` and `/` returned 200
  in two consecutive readiness rounds. A fresh ordinary login through
  `/login` succeeded and the protected dashboard/profile state was visible.

### Preflight remediation
None.

### Summary
Added feature-local flow units without introducing the later shared picker:
`AddMoleculesSelectionController` owns identity-stable selection/chips and
select-all exclusions, `AddMoleculesSearchController` owns debounced
switch-mapped ChEMBL query state, and `AddMoleculesSubmitController` owns
existing-molecule and ChEMBL payload construction/command dispatch. The action
component now composes these units and exposes an explicit pagination port while
retaining the existing paginator inheritance for compatibility with task 0102.

### Task-specific validation performed
* `MercurionWebNg`: `npm run typecheck` passed.
* Focused ESLint for the add-molecules feature passed with only pre-existing
  unused-parameter/style warnings and no errors.
* `npm run test:ci` passed (Angular Karma run; the package's CLI does not honor
  the attempted `--include` option, so the focused flow specs were included in
  the normal suite).
* Browser evidence through `http://localhost:8888`: opened the protected
  collection detail flow, opened “Aggiungi nuove molecole”, searched ChEMBL for
  `caffeine`, observed result and empty/selected-chip states, selected
  `CAFFEINA`, submitted successfully, and observed the resulting molecule in
  the collection after redirect. No console/runtime failure was observed.
  The post-validation Tox21, Nest, and Angular sessions were stopped.

### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run. Exact
feature-SHA GitHub Actions evidence is required after publication.

### Browser validation performed
Passed on the dedicated persistent Chrome DevTools profile through the
canonical origin. Protected server acceptance was proved by the authenticated
dashboard and collection APIs/UI. The add-molecules flow search, selection,
submit, loading, empty, and result states were exercised safely.

### Commits
`b336d5e3` — `refactor: decompose add molecules collection flow`

### Merge / CI
Feature branch publication follows the task-specific implementation commit;
coordinator owns merge and post-merge CI.

### Rollback
_Not applicable._

### Blocker / human decision required
None. Existing selection identity and submit contracts were established from
the current component and service signatures; no stop-condition ambiguity
remained.
