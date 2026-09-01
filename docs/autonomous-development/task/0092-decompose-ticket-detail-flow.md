# 0092 - Decompose ticket detail behind a ticket facade

- [ ] DONE
- [ ] BLOCKED

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

- [ ] Ticket detail action is a thin shell around facade and child components.
- [ ] Thread, message item, composer and toolbar are separate/testable units.
- [ ] Role-dependent actions are represented by typed capabilities.
- [ ] Reopening with another ticket cannot leak old state.
- [ ] Paging and submit flows have deterministic pending/error behavior.

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
