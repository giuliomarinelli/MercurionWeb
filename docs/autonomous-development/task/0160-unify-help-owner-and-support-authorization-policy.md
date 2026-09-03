# 0160 - Unify Help owner and support authorization policy

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make every Help ticket query/command evaluate ownership, `HandleTickets` support authority and `ViewUsers` field visibility through one typed policy so user/support resolver variants cannot drift in permissions or existence-leak behaviour.

Source: `DATA-011` in Series `0001`.

## Context

`HelpResolver` currently selects policy by passing booleans such as `onlyOwner` and `canViewUsers` into `HelpService`. User close performs a separate `getTicketDetail(... onlyOwner=true)` ownership check and then calls the unrestricted `closeTicket(ticketId)`, while support close/reopen call the same unrestricted command behind resolver decorators. Query methods also vary whether user IDs/full names are projected. This spreads authorization between decorators, resolver choreography, query predicates and presentation mutation.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/help/resolvers/help.resolver.ts`
- `MercurionWebNode/src/app_modules/help/services/help.service.ts`
- Help command/query use cases after BE decomposition
- Scope/authorization contracts
- response presenters from `0159`
- typed application errors

## In scope

- Define a typed Help actor/authorization policy representing owner identity and support capabilities.
- Centralize permission decisions for list/detail/messages, add-message, close and reopen operations.
- Push ownership constraints into the same DB query/update transaction where possible rather than separate check-then-act sequences.
- Preserve the deliberate distinction between `HandleTickets` (operate across tickets) and `ViewUsers` (see user identity fields).
- Define one not-found/forbidden disclosure policy for non-owned/missing tickets and apply it consistently.
- Remove boolean policy flags whose combinations allow invalid states.
- Add table-driven authorization tests across actor × operation × ticket ownership/status.

## Out of scope

- Do not invent new support roles/scopes.
- Do not allow `ViewUsers` alone to grant ticket-handling authority.
- Do not expose whether another user's ticket exists if current security behaviour intentionally hides that fact.
- Do not change response representation beyond what `0159` already establishes.

## Decisions already made

- Ownership/role authorization is an application/domain policy, not resolver-specific branching.
- `HandleTickets` and `ViewUsers` are independent capabilities with explicit effects.
- Check and mutation are atomic where stale authorization/ownership could produce TOCTOU behaviour.
- Every entrypoint invokes the same policy and use cases remain safe if called outside the current resolver.

## Requirements

1. Build an authorization matrix for owner, authenticated non-owner, support with `HandleTickets`, support with/without `ViewUsers`, and soft/unauthenticated access where applicable.
2. Replace `onlyOwner`/`canViewUsers` boolean combinations with a typed actor/policy context that cannot express invalid role combinations accidentally.
3. Move close/reopen/add-message authorization inside the command transaction/query predicate; eliminate resolver `get-then-close` authorization choreography.
4. Ensure user queries constrain ownership in SQL and support queries use explicit support authority.
5. Make field visibility select the correct immutable presenter from `0159` rather than mutating data after authorization.
6. Normalize missing/non-owned/forbidden results through typed application errors with the approved disclosure policy.
7. Add exhaustive policy tests plus integration tests that call use cases directly without GraphQL decorators.

## Acceptance criteria

- [ ] All Help commands/queries use one typed owner/support authorization policy.
- [ ] No unrestricted close/reopen command relies solely on a resolver decorator or prior read check.
- [ ] `HandleTickets` and `ViewUsers` semantics are consistent across every entrypoint.
- [ ] Non-owner/missing disclosure behaviour is deterministic and tested.
- [ ] Use cases remain authorization-safe when invoked directly outside GraphQL.
- [ ] Boolean `onlyOwner`/`canViewUsers` policy plumbing is removed.

## Validation

Run Help authorization matrix/unit tests, DB-backed owner/support integration tests, resolver tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if current user/support entrypoints intentionally have conflicting authorization semantics and the product/security policy does not establish which behaviour is canonical.

## Dependencies

- `0127` typed errors and `0159-separate-help-persistence-entities-from-response-dtos.md` must be `DONE`.
- Unit of Work from `0152` should be `DONE` for atomic command authorization.

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
