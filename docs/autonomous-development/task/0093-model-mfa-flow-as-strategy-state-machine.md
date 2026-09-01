# 0093 - Model MFA login as a strategy-driven state machine

- [ ] DONE
- [ ] BLOCKED

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
