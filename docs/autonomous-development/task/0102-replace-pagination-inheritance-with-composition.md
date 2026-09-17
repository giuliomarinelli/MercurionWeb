# 0102 - Replace pagination inheritance with typed composition

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove UI/component inheritance from `AbstractPaginationComponent` and `AbstractPaginatedMultiselectComponent`, replacing it with typed composition through the canonical pagination/page model and feature-local facades/controllers.

Source: `NG-016` in Series `0001`.

## Context

`AbstractPaginationComponent<T>` owns mutable UI state such as items/loading/sentinel and is inherited by Help, molecule collections, all-my-molecules, collection detail and ticket-detail flows. `AbstractPaginatedMultiselectComponent<T>` extends it further and is used by add-molecules flows. UI task `UI-016` already establishes the canonical accessible pagination/infinite-load primitive and page/cursor model; earlier tasks in this batch have moved feature query/page ownership toward facades. This task must remove inheritance rather than invent another paging layer.

## Relevant files and modules

- `MercurionWebNg/src/app/abstract/abstract-pagination-component.ts`
- `MercurionWebNg/src/app/abstract/abstract-paginated-multiselect-component.ts`
- their specs
- Help page, ticket detail, collection detail, all-my-molecules and my-molecule-collections consumers
- add-molecules flow after `0089`
- canonical pagination/infinite-load primitive/model from `UI-016`

## In scope

- Define a reusable typed pagination controller/facade contract or pure reducer/helper compatible with the canonical UI primitive.
- Migrate every production component that extends either pagination base class to composition.
- Keep network/query ownership in each feature facade/gateway; generic pagination code manages only page/cursor state/transitions.
- Preserve sentinel/infinite-load behavior through explicit lifecycle ownership rather than inherited `ElementRef` fields.
- Delete obsolete abstract base classes after the last production consumer is migrated.
- Add reusable pagination-controller tests plus migrated feature regression tests.

## Out of scope

- Do not create a generic pagination service that owns domain queries for every feature.
- Do not globally redesign Apollo cache policies; later NG tasks own that.
- Do not change user-visible page-size/cursor semantics unless required by the canonical existing model.
- Do not preserve inheritance merely as a compatibility wrapper after all consumers are migrated.

## Decisions already made

- Pagination is composition, not UI inheritance.
- The generic layer owns pagination state/transitions only; callers provide typed fetch commands/data.
- The canonical UI primitive remains the rendering/accessibility layer established by `UI-016`.
- Each feature owns its observer/sentinel lifecycle explicitly.

## Requirements

1. Inventory every subclass of both abstract pagination classes and migrate all production consumers.
2. Represent initial/load-more/reset/error/end-of-data transitions explicitly and test them.
3. Prevent concurrent duplicate page loads and stale page append after query/filter identity changes.
4. Keep item identity/deduplication policy caller-provided where domain-specific.
5. Ensure observer/listener teardown on component/facade destruction.
6. Remove the abstract classes and unused tests/imports once migration is complete.

## Acceptance criteria

- [ ] No production Angular component extends a pagination UI base class.
- [ ] `AbstractPaginationComponent` and `AbstractPaginatedMultiselectComponent` are removed.
- [ ] All migrated features use the canonical pagination model/primitive through composition.
- [ ] Reset/load-more/error/end transitions are deterministic and tested.
- [ ] No stale/concurrent duplicate page appends occur.

## Validation

Run the generic pagination-controller tests plus focused tests for every migrated consumer, then canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise pagination/infinite load in each reachable migrated feature: Help/tickets, molecule collections, collection detail, all-my-molecules and collection-picker/add-molecules flows. Verify reset after search/filter change, end state, rapid repeated scroll/load and no duplicate/stale items or console errors.

## Stop conditions

Mark `BLOCKED` if a consumer depends on undocumented inheritance side effects that cannot be reproduced safely without clarifying intended behavior.

## Dependencies

- `UI-016` must be `DONE`.
- `0089`, `0092` and `0096` should be `DONE` so their feature boundaries can consume composition cleanly.

## Execution notes

### Feature branch
`feature/NG-016`, preserved and frozen at
`3f17b306854a561c3853744a641c7e353115a337`.

### Preflight
Passed unchanged-base preflight on 2026-09-15 from base
`10836e1a7cbf6b01494824df60e1ceda61573689`. Exact base CI run `35024067111`
passed with the required full path, both platform jobs, and `Required gate`.
The worker completed the non-navigating Chrome DevTools probe, started Tox21,
Nest, and Angular in the required order, obtained two readiness rounds, and
completed a fresh ordinary real-account login with a protected dashboard.

### Preflight remediation
The first runtime start used incorrect working directories and was stopped
without HTTP requests. The canonical startup was then repeated correctly.

### Summary
The worker implemented typed composition for the remaining pagination
consumers, added deterministic pagination-controller transitions and tests,
removed both abstract pagination UI bases, and updated the execution notes.
The implementation was not integrated because required browser acceptance
coverage could not be completed after repeated Chrome DevTools MCP transport
timeouts. The branch is preserved for human-authorized recovery.

### Task-specific validation performed
Focused typecheck, Angular lint, pagination-controller tests, migrated consumer
tests, and final controller/add/bind regression tests passed. Browser evidence
covered the protected dashboard, all-my-molecules, my-molecule-collections,
collection detail, and the add-molecules empty state. Help/tickets,
collection-picker/bind, and the remaining add-flow interactions could not be
completed or re-observed after repeated `McpError -32001: Request timed out`
failures; no unavailable evidence is claimed.

### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are forbidden in autonomous
workers. The feature branch was not eligible for feature-SHA CI because it
was blocked before integration.

### Browser validation performed
Partial pre-implementation and post-implementation evidence was recorded in
the worker notes. The remaining required journeys were blocked by the MCP
transport incident.

### Commits
Feature implementation and blocked-attempt notes are preserved on
`feature/NG-016` through `3f17b306854a561c3853744a641c7e353115a337`.

### Merge / CI
No merge. This metadata-only blocked outcome requires exact-SHA CI on
`develop`.

### Rollback
_Not applicable._

### Blocker / human decision required
Repeated post-implementation Chrome DevTools MCP transport timeouts prevented
completion of the remaining browser acceptance journeys. A human-authorized
recovery is required before this preserved branch can be resumed.
