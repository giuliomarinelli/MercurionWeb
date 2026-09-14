# 0092 - Decompose ticket detail behind a ticket facade

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Separate ticket-detail query/state, message thread, composer, pagination and role-dependent commands into independent units behind a typed ticket facade, leaving the action component as a thin composition shell.

Source: `NG-006` in Series `0001`.

## Context

`ticket-detail.component.ts` is an action component tied to `TicketDetailContextService`, `ActionOverlayContextService`, GraphQL `HelpService` and pagination inheritance. The current GraphQL service uses `watchQuery` for ticket detail and the action combines detail/thread interaction with pagination and authorization concerns. Later tasks `NG-016` and `NG-023/024` respectively replace pagination inheritance and rationalize Apollo policies; this task should establish boundaries compatible with those later changes.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/ticket-detail/ticket-detail.component.ts`
- ticket-detail/message-item components and specs
- `MercurionWebNg/src/app/services/context/action-context/ticket-detail-context.service.ts`
- `MercurionWebNg/src/app/services/graphql/help.service.ts`
- `MercurionWebNg/src/app/Models/graphql/help.models.ts`
- help GraphQL operations

## In scope

- Introduce a ticket-detail facade with discriminated loading/error/content state.
- Separate thread/message rendering, composer and toolbar/role actions into components with narrow typed APIs.
- Move pagination/query coordination out of the action component.
- Centralize authorization-derived command availability in the facade/view model rather than template-local branching.
- Ensure message/send/reload flows have explicit concurrency semantics.
- Add focused tests for detail load, paging, send/retry/cancel and role capability mapping.

## Out of scope

- Do not redesign backend ticket authorization or GraphQL schema.
- Do not implement the final generic pagination-composition migration owned by `0102`; expose a boundary that it can adopt.
- Do not globally change Apollo cache/fetch policy before the dedicated later tasks.

## Decisions already made

- Presentational message/thread/composer components do not call GraphQL services directly.
- Role/capability decisions are derived once and exposed as a typed view model.
- Ticket action lifecycle is isolated per action session.

## Requirements

1. Provide one facade state for ticket identity, detail, thread page state, composer state and capabilities.
2. Ensure switching/reopening ticket context cannot show stale previous-ticket data.
3. Make message pagination and submission independently cancellable/testable.
4. Keep thread rendering independent from composer/toolbar command orchestration.
5. Preserve current user/admin capability behavior.
6. Remove duplicated reload/refetch triggers from component-local state.

## Acceptance criteria

- [x] Ticket detail action is a thin shell around facade and child components.
- [x] Thread, message item, composer and toolbar are separate/testable units.
- [x] Role-dependent actions are represented by typed capabilities.
- [x] Reopening with another ticket cannot leak old state.
- [x] Paging and submit flows have deterministic pending/error behavior.

## Validation

Run focused ticket facade/component tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open tickets available in local data, load additional thread pages, submit/validate composer behavior where permitted, close/reopen different tickets, verify role-specific controls and inspect GraphQL/network/console behavior.

## Stop conditions

Mark `BLOCKED` if current role/permission semantics are inconsistent between frontend and backend and resolving them requires a product/security decision.

## Dependencies

- Canonical action/dialog/form/page-state primitives from earlier tasks must be available.

## Execution notes

### Feature branch
`feature/NG-006`, recovered from preserved SHA `d5b2e4515` after the direct
human recovery instruction. Accidental AGENTS/snapshot content was neutralized
without rewriting history by revert commit `1354189b7`.

### Preflight
`develop`/`origin/develop` were clean and equal at `7ef4c62eb`; full CI run
`34876716394` was green across Windows, Ubuntu and `Required gate`. The isolated
npm capability probe succeeded and cleaned its exact temporary directory.
Angular typecheck and the pre-change Angular suite (`484/484`) passed.

### Preflight remediation
No baseline remediation. The preserved branch contained only accidental
control-plane edits, whose tree effect was reverted before task implementation.

### Summary
Introduced a per-overlay ticket facade with a discriminated detail state,
independent thread/composer/command state, typed capabilities, request-version
isolation and explicit paging/submit cancellation. Extracted presentational
thread and toolbar components and reduced the action component to composition.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npm run lint:angular --workspace mercurion_web_ng` — passed.
- `npm run test:ci --workspace mercurion_web_ng` — `490/490` passed.
- `git diff --check` — passed.

### Full pre-merge CI-parity validation
Owned by the exact feature-SHA GitHub Actions run; local `npm ci` and
`npm run ci:check` were not invoked.

### Browser validation performed
Through `http://localhost:8888`, the authenticated user and support surfaces
loaded successfully. Opened `MTCK-000000078`, then closed/reopened
`MTCK-000000079` and verified that the prior ticket did not leak. Verified the
closed-user composer policy, support requester identity and reopen capability,
an open support composer, deterministic enable/clear behavior without sending
test data, authenticated websocket state and zero browser console errors.

### Commits
Implementation and execution-note commit on `feature/NG-006` (feature HEAD).

### Merge / CI
Exact feature-SHA and post-merge `Required gate` evidence is required before
the outcome becomes final.

### Rollback
If post-merge CI does not succeed, revert the no-fast-forward merge and record
`REVERTED` according to the repository protocol.

### Blocker / human decision required
None.
