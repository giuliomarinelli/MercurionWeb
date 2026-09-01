# 0190 - Cover the Angular auth/session state machine

- [ ] DONE
- [ ] BLOCKED

## Objective

Build deterministic Angular tests for the complete client authentication/session state machine, covering login, MFA, refresh, logout, cross-tab synchronization and realtime reconnection including race and failure scenarios.

Source: `QA-004` in Series `0001`.

## Context

The FE tasks replace fragmented browser storage, duplicated auth checks and ad-hoc reconnect logic with a canonical client session entity, explicit auth state store and cancellable realtime state machine. Those architectural changes are security-sensitive: a late refresh must not resurrect a logged-out session, another tab must invalidate coherently, MFA state must not leak across attempts and realtime connections must follow the current authenticated session. The audit found no suite that proves this lifecycle end to end at the Angular service/state layer.

## Relevant files and modules

- canonical auth/session store from FE-004 through FE-016
- `AuthService` after decomposition/refactor
- session persistence/browser-storage adapter
- `SessionSyncService` / replacement state machine
- `RealtimeSocketService` / realtime facade
- auth interceptors and guards
- login/MFA/SSO state services
- Angular test utilities

## In scope

- Create deterministic test harnesses for clock/time, HTTP, browser-storage adapter, cross-tab events and Socket.IO/realtime transport.
- Test login first step through authenticated session creation, including MFA-required and direct-success branches.
- Test refresh success/failure, token/session replacement and stale/late refresh results.
- Test logout while refresh/reconnect work is in flight.
- Test cross-tab login/logout/session invalidation without using real browser sleeps.
- Test realtime disconnect/reconnect behavior when auth state changes.
- Test relevant storage corruption/expired pre-auth state behavior from FE contracts.

## Out of scope

- Do not use live OAuth providers, live network services or wall-clock waiting.
- Do not reimplement auth state solely inside tests; exercise the production store/facades through controlled adapters.
- Do not duplicate server-side token/MFA/session semantics owned by `0192`.
- Do not replace browser-level critical journeys owned by `0195`.

## Decisions already made

- The canonical client session is atomic: late async work cannot overwrite a newer or revoked session.
- Cross-tab synchronization uses one owned mechanism established by FE tasks.
- Realtime retry/reconnect is bounded/cancellable and derives from authenticated session state.
- Tests control time and transport events explicitly; arbitrary sleeps are forbidden.

## Requirements

1. Provide reusable fakes/adapters for deterministic clock, storage events/BroadcastChannel if retained, HTTP responses and realtime transport events.
2. Cover direct login success, MFA-required login, MFA completion/failure and safe redirect restoration.
3. Cover refresh success, terminal refresh failure and two overlapping refresh attempts with deterministic ordering.
4. Prove logout wins over a late refresh response and a late reconnect callback.
5. Prove a logout/session replacement in another tab updates the local store exactly once without navigation/logout loops.
6. Prove reconnect uses the current session/auth generation and cancels obsolete timers/listeners.
7. Cover malformed/expired pre-auth and session-persistence records according to their FE codecs.
8. Assert no test leaves listeners, timers, subscriptions or sockets owned after teardown.

## Acceptance criteria

- [ ] Login→MFA→authenticated and direct-login flows are deterministically covered.
- [ ] Refresh/logout and refresh/session-replacement races cannot resurrect stale auth state.
- [ ] Cross-tab synchronization is covered for login/logout/invalidation without duplicate side effects.
- [ ] Realtime reconnect follows the current authenticated session and cancels stale work.
- [ ] Tests use controlled time/transports and leave no owned resources after teardown.

## Validation

Run the focused auth/session specs repeatedly to detect order dependence, then the complete Angular suite, lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not required for this service/state-machine task; `0195` and `0197` validate the corresponding browser/system journeys through `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if an auth race or terminal-failure policy is still unresolved after the relevant FE task, because tests must encode an approved state transition rather than invent product/security semantics.

## Dependencies

- FE auth/session tasks `0026`–`0040` must be `DONE` as applicable.
- `0187` must provide a green Angular test runner.

## Implementation notes

Model races by controlling Promise/Observable completion order, not by making timeout values tiny. Every test should be able to state which session generation wins and why.

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