# 0031 - Make logout a deterministic session transition

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Give logout one explicit state-transition policy for server success, network failure and server rejection so the Angular client cannot end in a partially authenticated state.

Source: `FE-009` in Series `0001`.

## Context

`AuthService.logout()` currently clears client login cookies, `login`, HTTP/WS tokens and an owned refresh lock before issuing `DELETE /api/authentication/logout`. `SessionSyncService` separately has `notifyVoluntaryLogout()`, `logout()`, anonymous/session-expired handling and toast suppression. This ordering means the server request result arrives after local credentials have already been destroyed, but the failure semantics are not represented explicitly.

Earlier tasks provide the canonical auth store/persistence boundary. This task turns logout into one use case rather than unrelated local cleanup plus an HTTP request.

## Relevant files and modules

- canonical auth store/facade from `0026`
- auth/session persistence adapter from `0028`
- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- logout UI/menu/header/sidenav callers
- Nest logout endpoint and its tests under `MercurionWebNode/src/app_modules/auth/`
- Socket.IO public/private transition API

## In scope

- Model voluntary logout as one canonical command/transition.
- Define deterministic local and server outcomes for success, offline/network error and server rejection based on the existing server contract and security requirements.
- Ensure token/scope/initials/socket/cross-tab cleanup is atomic from the application's perspective.
- Prevent duplicate logout HTTP calls, duplicate redirects/toasts and competing cleanup paths.
- Add tests for each outcome and repeated/concurrent logout requests.

## Out of scope

- Changing server logout/session-revocation semantics unless a concrete incompatibility must be fixed to satisfy this task.
- General retry infrastructure for all HTTP commands.
- Cross-tab mechanism design (`0030`) beyond publishing/consuming the canonical logout event.
- Route-policy redesign.

## Decisions already made

- Voluntary logout is represented explicitly in the canonical auth state machine.
- The UI must never remain partly authenticated: no state where, for example, initials are cleared while protected selectors/scopes/socket remain private, or vice versa.
- Logout cleanup is performed through the canonical session/persistence owner, not scattered callers.
- Private realtime state must downgrade/terminate consistently with logout.
- The precise treatment of a failed server revocation must be supported by the server contract/security model; if repository evidence does not establish it, request a human decision rather than guess.

## Requirements

1. Read the Nest logout controller/service and tests to establish what success/failure means and whether a failed request can leave a still-valid server session.
2. Define explicit store states/events such as logout requested, logout completed and logout failed/revocation uncertain only if needed by the chosen policy.
3. Ensure multiple UI callers invoke one logout command rather than manually clearing state.
4. Serialize/dedupe concurrent logout requests so repeated clicks/session events do not issue competing cleanup transitions.
5. On the chosen successful/failure policy, clear or retain HTTP token, WS token, scopes, initials/client markers and cross-tab state atomically through the session owner.
6. Coordinate Socket.IO downgrade/disconnect without relying on stale credentials after cleanup.
7. Preserve `redirect_to`/navigation behaviour intentionally; voluntary logout should not be confused with an expired-session redirect loop.
8. Add tests for server success, network error, representative server rejection, duplicate logout calls and late socket/session-expired events arriving during logout.
9. Ensure a subsequent login starts from a clean state regardless of the prior logout outcome permitted by policy.

## Acceptance criteria

- [ ] Logout has one canonical implementation and state transition.
- [ ] Success, network failure and server rejection have explicit tested outcomes.
- [ ] No outcome leaves a partially authenticated Angular state.
- [ ] Repeated/concurrent logout requests are idempotent or single-flight.
- [ ] Voluntary logout does not produce duplicate session-expired toasts/navigation.
- [ ] Cross-tab peers and realtime state converge according to the canonical logout result.
- [ ] A new login after logout is not contaminated by prior tokens/scopes/locks.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused logout tests with mocked server success/network/rejection outcomes plus late session/socket events.

If backend behaviour must change, run the relevant Nest auth tests/build as well.

## Browser validation

Mandatory for the normal success path when credentials are available, using `http://localhost:8888` and Chrome DevTools MCP:

1. Authenticate and confirm a private/protected session.
2. Trigger logout once.
3. Verify exactly one logout request, anonymous UI/route state, cleared owned credentials and non-private realtime state.
4. Confirm no duplicate expiry toast or redirect loop appears.

Failure modes may be established with deterministic automated tests if browser-level network/rejection simulation is not reliable.

## Stop conditions

**Mandatory:** mark `BLOCKED` if the repository/server contract does not determine whether local logout should remain final when server revocation fails, and choosing that policy would change the security/product contract. Report the concrete alternatives and current server-session consequences.

## Dependencies

- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`
- `0030-complete-cross-tab-authentication-synchronization.md`

## Implementation notes

Do not solve server-failure ambiguity by silently swallowing errors while leaving a valid remote session indefinitely, nor by restoring stale local credentials after they have been invalidated without an explicit policy. Make the chosen contract visible in state/tests.

## Execution notes

### Summary

Skipped without implementation because hard prerequisites `0026-create-canonical-angular-auth-state-store.md` (`FE-004`) is `BLOCKED`, while `0028-encapsulate-auth-session-browser-persistence.md` (`FE-006`) and `0030-complete-cross-tab-authentication-synchronization.md` (`FE-008`) are `SKIPPED_DEPENDENCY`.

### Validation performed

- No task branch or worker was created.
- Direct prerequisites: `FE-004` is `BLOCKED`; `FE-006` and `FE-008` are `SKIPPED_DEPENDENCY`.
- Transitive dependency chain: `FE-009` -> `FE-004` (`BLOCKED`), `FE-006` (`SKIPPED_DEPENDENCY`) -> `FE-004` (`BLOCKED`), and `FE-008` (`SKIPPED_DEPENDENCY`) -> `FE-004` (`BLOCKED`) plus `FE-006` (`SKIPPED_DEPENDENCY`).

### Browser validation performed

Not applicable; the task was skipped before implementation.

### Changed files

No files changed; only this task metadata was updated.

### Blocker / human decision required

No implementation blocker. The task may be re-enabled only after its hard
dependency chain is deliberately resolved in a new authorized session.