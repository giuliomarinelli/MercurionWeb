# 0030 - Complete cross-tab authentication synchronization

- [ ] DONE
- [ ] BLOCKED

## Objective

Make login/logout/session changes converge deterministically across browser tabs using one fully owned cross-tab synchronization mechanism, and remove the currently orphaned `BroadcastChannel` path if it is not the chosen mechanism.

Source: `FE-008` in Series `0001`.

## Context

`AuthService` constructs `new BroadcastChannel('mercurion-auth')` and exposes `broadcastLogin()` / `broadcastLogout()`, but the current repository contains no consumer of those methods and no `BroadcastChannel` listener. Independently, `SessionSyncService` listens for `storage` events on `login` and `ws_accessToken` and attempts cross-tab convergence with cookie guards. `AuthService` also uses storage events for WS refresh locking/token changes.

The steady state must have one understandable cross-tab protocol rather than half of a BroadcastChannel implementation plus separate storage-event semantics.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- canonical auth store from `0026`
- auth/session persistence adapter from `0028`
- login/logout/MFA/SSO completion paths
- tests able to simulate two tabs/storage events

## In scope

- Inventory every cross-tab auth/session synchronization mechanism.
- Select one canonical mechanism based on the existing implementation and remove dead/duplicate machinery.
- Define typed cross-tab events/state transitions for login, logout and credential/session changes that actually require peer notification.
- Ensure all tabs converge without duplicate logout/navigation/toasts or stale private Socket.IO state.
- Add deterministic multi-context tests.

## Out of scope

- General cross-tab messaging for unrelated application domains.
- Replacing server session validation with browser peer messages.
- Socket reconnection algorithm redesign (`0039`), except invoking its public commands correctly.
- Adding a service worker solely for cross-tab auth.

## Decisions already made

- There is exactly one canonical cross-tab auth synchronization path.
- A browser peer event is a synchronization hint/event, not proof of server authentication.
- Existing orphaned BroadcastChannel code must either become a complete owned protocol or be removed.
- Given the current code already has working storage-event infrastructure, prefer consolidating around that existing mechanism unless repository evidence at execution time shows BroadcastChannel provides a necessary capability that storage events cannot satisfy.
- All peer events feed the canonical auth store/session protocol rather than directly mutating UI state.

## Requirements

1. Confirm whether `broadcastLogin()` / `broadcastLogout()` have any live callers by execution time.
2. Inventory `storage` listeners and distinguish auth state propagation from WS refresh-lock/token coordination.
3. Define the canonical cross-tab event/state semantics: what change is observed, what is revalidated locally/server-side, and what store command results.
4. If the existing storage-event path is sufficient, remove the unused `BroadcastChannel`, methods and lifecycle burden; otherwise fully implement typed BroadcastChannel receive/close semantics and remove redundant auth-state storage-event messaging.
5. Ensure external login causes a peer tab to revalidate/upgrade session state without trusting initials/token blindly.
6. Ensure external logout makes peer tabs converge to anonymous when server/client markers confirm logout, with no duplicate toast/navigation loops.
7. Ensure token refresh events update private socket auth through the canonical token/session path without recursively triggering login/logout transitions.
8. Clean up window/channel listeners deterministically when their owner is destroyed or use an application-lifetime singleton whose lifecycle is explicit and tested.
9. Add tests simulating two tabs/contexts and event ordering, including duplicate events and stale events.

## Acceptance criteria

- [ ] Only one cross-tab auth synchronization mechanism remains authoritative.
- [ ] No orphaned `BroadcastChannel` object/method remains.
- [ ] Login in one tab causes another tab to converge after canonical session validation.
- [ ] Logout in one tab makes another tab converge to anonymous without duplicate navigation/toasts.
- [ ] WS token-refresh synchronization does not create auth-state loops.
- [ ] Duplicate/stale peer events are idempotent.
- [ ] Cross-tab listeners have explicit lifecycle/cleanup ownership.
- [ ] Angular tests/build pass.

## Validation

From `MercurionWebNg`:

```text
npm test -- --watch=false
npm run build
```

Run focused tests with two independent store/persistence contexts or equivalent fake `StorageEvent`/channel peers and prove idempotent convergence.

## Browser validation

Mandatory when local authentication credentials are available. Using Chrome DevTools MCP through `http://localhost:8888`:

1. Open two pages/tabs for the same origin.
2. Authenticate in tab A and verify tab B converges to the correct authenticated/session state without reload if that is the supported UX.
3. Logout in tab A and verify tab B converges to anonymous, leaves protected UI/routes, and downgrades realtime state appropriately.
4. Inspect console/network for duplicate redirects, repeated logout calls or reconnect storms.

If the browser tooling cannot create/manage two pages or credentials are unavailable, record that exact blocker; multi-context automated tests remain mandatory.

## Stop conditions

Mark `BLOCKED` if a required cross-tab behaviour (for example whether login should immediately authenticate another already-open tab without explicit server revalidation) is not defined by the session protocol and cannot be inferred safely. Do not treat a peer message as an authentication credential.

## Dependencies

- `0010-unify-session-state-protocol.md`
- `0026-create-canonical-angular-auth-state-store.md`
- `0028-encapsulate-auth-session-browser-persistence.md`
- `0029-preserve-authorization-scopes-through-every-login-flow.md`

## Implementation notes

The current `storage`-event path is already materially implemented while BroadcastChannel is send-only. Preserve the smallest coherent mechanism unless there is a concrete reason to switch; the goal is deterministic behaviour, not novelty.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._