# 0102 - Replace pagination inheritance with typed composition

- [x] DONE
- [ ] BLOCKED
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

- [x] No production Angular component extends a pagination UI base class.
- [x] `AbstractPaginationComponent` and `AbstractPaginatedMultiselectComponent` are removed.
- [x] All migrated features use the canonical pagination model/primitive through composition.
- [x] Reset/load-more/error/end transitions are deterministic and tested.
- [x] No stale/concurrent duplicate page appends occur.

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
`feature/NG-016` (base `10836e1a7cbf6b01494824df60e1ceda61573689`).

### Preflight
Passed unchanged-base preflight on 2026-09-15:

- branch was clean and exactly `feature/NG-016` at the supplied base SHA;
- exact base CI run `35024067111` was successful, including Ubuntu and Windows
  prerequisites, Angular unit tests, Nest unit/E2E tests, builds and
  `Required gate`;
- no task-owned Angular, Nest, Tox21 or watcher process was active;
- the non-navigating Chrome DevTools surface probe returned the selected
  `about:blank` page;
- canonical Tox21, Nest and Angular startup completed in order, followed by
  two consecutive `http://localhost:8888` readiness rounds;
- fresh real-account login succeeded through the ordinary login form using
  MCP `fill_form`, and the protected dashboard rendered.

### Preflight remediation
The first attempted runtime start used incorrect working directories and was
stopped without HTTP requests. The canonical three-process startup was then
repeated correctly using `../MercurionTox21`, the repository-root Nest
workspace command, and `MercurionWebNg`.

### Summary
Implemented typed composition for the five remaining pagination consumers:
Help, all-my-molecules, my-molecule-collections, add-molecules and
bind-collections. Added the pure `PaginationController` with explicit
initial/append/reset/retry/end/error transitions, duplicate-load protection and
generation-based stale-response suppression. Removed both abstract pagination
UI bases and their obsolete specs. Collection-detail and ticket-detail were
already composition-based on this branch.

### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_ng`
- `npm run lint:angular --workspace mercurion_web_ng`
- pagination controller suite: 4 specs passed
- migrated consumer suite (Help, all-my-molecules, my-molecule-collections,
  add-molecules and bind-collections): 5 specs passed
- final controller/add/bind regression suite: 6 specs passed
- no production references remain to either removed abstract class.

Browser evidence obtained before the Chrome transport incident:

- protected fresh-login dashboard;
- all-my-molecules: populated cards, end-of-results state, search reset;
- my-molecule-collections: populated collection and end-of-results state;
- collection detail: populated items and end-of-results state;
- add-molecules dialog opened through collection detail and rendered its
  empty available-items state (the test collection already contains all
  available personal molecules).

After the final runtime restart, the Chrome DevTools MCP timed out twice on
the supported ChEMBL/add-flow interaction and then on snapshot/wait calls
(`McpError -32001: Request timed out`). The tool surface/list-pages call
remained responsive, but the required add-flow interaction and Help/ticket
browser evidence could not be completed or re-observed. No browser evidence
is claimed for those incomplete checks.

### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are forbidden in autonomous
workers. Exact feature-SHA GitHub Actions evidence remains coordinator-owned.

### Browser validation performed
Partial only; see the concrete evidence and MCP transport diagnostic under
Task-specific validation performed. Runtime sessions were stopped after the
incident and no task-owned runtime process remained.

### Commits
`2c38e2ef` implementation commit was published first. The preserved branch
contains the subsequent note correction and non-rewriting reconciliation commits
`fd42c0e1` and `408c57ec`.

### Merge / CI
No merge. The preserved blocked-attempt commit was published to
`origin/feature/NG-016` for coordinator-controlled recovery; no integration
branch was modified.

### Rollback
Not applicable; no merge occurred.

### Blocker / human decision required
The post-implementation Chrome DevTools MCP interaction transport must be
restored and the remaining browser acceptance replayed through the canonical
origin: Help/tickets, collection-picker/bind flow, and the ChEMBL/add-flow
interaction including rapid repeated load/reset observation. Human decision:
resume this preserved feature branch only after that browser capability is
available; do not infer completion from the focused tests or partial browser
evidence.

### Interactive recovery 2026-09-17

Merged current `develop` into the preserved branch without rewriting its
history. The only merge conflict was this execution-note section; the richer
original evidence was retained. Current focused validation passed Angular
typecheck, lint, and 15 pagination/controller/consumer specs. Repository search
confirmed that neither removed abstract base has a remaining production
reference.

The canonical Tox21, Nest and Angular processes started successfully after
copying the ignored development environment and key files into the isolated
worktree. Two consecutive nginx-edge readiness rounds returned HTTP 200 for
both `/health` and `/`. The browser evidence already recorded above remains
valid for the reachable populated and empty states. The recovery environment
did not expose an isolated browser surface, so no additional interactive claim
is made; exact feature CI must additionally pass its critical browser journey
before integration. All three recovery-owned runtime processes were stopped.

The prior transport incident is no longer treated as a product blocker. Final
integration evidence is recorded after exact feature- and merge-SHA CI.

Feature `5957783e899448fc0481034134b9e6ae80b4fab6` passed full CI run
`35265369047`, including critical browser journeys and `Required gate`. Merge
`7a83321b8745f97c9cf9a60e3ef13bfeb957ca9e` exposed the pre-existing axe
rendering race in run `35266181805`; it was repaired forward without reverting
the merge. Fix `92a176caa39b0e28925c98fd5e034d83cbb1c563` passed full run
`35267240243`. Dependency skips `0109`, `0110` and `0112` were reset to pending,
and the authoritative planner reported no stale skips.
