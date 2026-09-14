# 0093 - Model MFA login as a strategy-driven state machine

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the branch-heavy MFA page lifecycle with a typed strategy contract and exhaustive state machine so each supported MFA method owns its step-specific behavior while the page only selects a strategy and renders state.

Source: `NG-007` in Series `0001`.

## Context

`MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts` is a route-level component that injects routing, fingerprint/session services and currently owns a large `ngOnInit` with multiple MFA branches. Earlier FE tasks establish typed pre-auth state, canonical auth session ownership and MFA error lifecycle. This task must consume those contracts rather than reintroduce storage/fingerprint/session branching in the page.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.ts`
- `MercurionWebNg/src/app/pages/login/mfa/mfa.page.component.spec.ts`
- auth/MFA models and pre-auth state established by FE tasks
- `MercurionWebNg/src/app/services/auth.service.ts` or its post-`0097` facade/repositories
- session/fingerprint adapters used by the current MFA flow

## In scope

- Define a common MFA strategy interface for supported MFA methods.
- Model MFA page state as an exhaustive discriminated union.
- Move method-specific initialization, validation, submit and retry behavior into strategies/use cases.
- Keep redirect/final session establishment behind canonical auth facade commands.
- Make invalid/expired pre-auth state transition to a safe terminal/redirect state.
- Add strategy contract tests and page state-machine tests.

## Out of scope

- Do not change backend MFA algorithms or factor requirements.
- Do not weaken pre-auth expiry/re-authentication/security checks.
- Do not let strategies read/write raw storage when canonical pre-auth/session adapters exist.
- Do not redesign general login orchestration owned by `0094`.

## Decisions already made

- MFA method selection is driven by validated typed pre-auth state.
- Every strategy implements the same application-level contract.
- The page does not own transport, fingerprint persistence or auth session mutation.
- Unknown/unsupported MFA methods fail safe rather than falling through a default branch.

## Requirements

1. Define explicit states such as initializing, challenge-ready, submitting, recoverable-error, completed and terminal-invalid/expired as appropriate to the existing flows.
2. Define a strategy factory/registry keyed by the canonical `MfaStrategy` values.
3. Make duplicate submits impossible while a strategy command is pending.
4. Ensure cancellation/navigation destroys strategy-local pending work.
5. Preserve redirect-after-login and final session establishment semantics.
6. Cover every supported strategy and unknown/expired input in tests.

## Acceptance criteria

- [ ] MFA page contains no method-specific initialization/submit branch tree.
- [ ] Supported MFA strategies share one typed contract.
- [ ] State transitions are exhaustive and tested.
- [ ] Invalid/expired pre-auth state cannot continue authentication.
- [ ] Existing MFA login variants complete with compatible session/redirect behavior.

## Validation

Run focused MFA strategy/page/auth-flow tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise every MFA strategy that local test accounts/data support, including invalid code/error/retry, back/cancel and reload/expired-state behavior. Verify no stale challenge state after navigation and no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a supported MFA strategy cannot be mapped to an authoritative existing protocol or if local validation would require unavailable secrets/devices and no deterministic test double exists.

## Dependencies

- Typed pre-auth/MFA state task `0034` and canonical auth/session state tasks must be `DONE`.

## Execution notes

### Feature branch
`feature/NG-007`

### Preflight
Clean `feature/NG-007` at base `5c26cc675c018ee0fa0cb88a2ca2b9e73aec404b`;
`develop` and `origin/develop` matched that SHA before implementation.
Repository-local `commit.gpgSign` was `false`. The supplied exact metadata CI
evidence for the current base was accepted. No task-owned Angular, Nest, or
Tox21 process was active before implementation.

### Preflight remediation
_None._

### Summary
Added a typed `MfaStrategySession` contract and registry for email OTP, SMS
OTP, app TOTP, and backup-code flows. The page now selects a strategy from
validated pre-auth state, exposes explicit state-machine states, blocks
duplicate submissions, cancels strategy-local work on navigation/destruction,
and fails safe for missing, expired, invalid, or unsupported pre-auth state.
Final session activation and redirect remain behind the canonical auth/session
services.

### Task-specific validation performed
`npm run typecheck --workspace mercurion_web_ng` passed.
`npm run lint --workspace mercurion_web_ng` passed with pre-existing warnings
only.
`npm run test:ci --workspace mercurion_web_ng` passed: 445 tests.
Added strategy contract tests covering all four strategies, unknown strategy
rejection, duplicate-submit prevention, cancellation, and terminal state
transitions.

### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` remain GitHub Actions-only.

### Browser validation performed
Started the canonical task-scoped Tox21, Nest, and Angular processes in the
required order. Two readiness rounds through `http://localhost:8888` returned
the Angular shell with HTTP 200; `/health` returned HTTP 502 while the edge
remained reachable. Navigating directly to
`http://localhost:8888/login/mfa/APP_TOTP` without pre-auth state redirected to
the safe 403 terminal page. The browser console showed only the existing
development WebSocket 502 while the upstream was unavailable. All
task-owned processes were stopped after validation.

### Commits
Pending feature commit on `feature/NG-007`.

### Merge / CI
Not performed by this worker. Exact feature-SHA CI and later merge lifecycle
belong to the coordinator.

### Rollback
_Not applicable._

### Blocker / human decision required
None for local implementation. Authenticated MFA variants requiring a live
pre-auth challenge were covered by the strategy contract tests; the browser
probe covered the invalid/expired-safe terminal path because no pre-auth
challenge was available in the local browser session.
