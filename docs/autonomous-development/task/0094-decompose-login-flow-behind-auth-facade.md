# 0094 - Decompose login flow behind the canonical auth facade

- [ ] DONE
- [ ] BLOCKED

## Objective

Separate credential form, SSO choice and login-flow orchestration so `LoginPageComponent` becomes a presentation/composition layer consuming the canonical auth facade/state machine and never accesses storage or HTTP directly.

Source: `NG-008` in Series `0001`.

## Context

`MercurionWebNg/src/app/pages/login/login.page.component.ts` currently combines form handling with routing, fingerprint/session synchronization and authentication flow concerns. Earlier FE tasks establish the canonical auth store/facade, redirect store, typed pre-auth/MFA state, persistence adapter and atomic session ownership. This task is the structural decomposition that forces the page to use those contracts consistently.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/login/login.page.component.ts`
- `MercurionWebNg/src/app/pages/login/login.page.component.spec.ts`
- auth facade/store/persistence/redirect/pre-auth contracts created by FE tasks
- SSO route/components/providers
- fingerprint/session adapters currently used by login
- canonical field/button/error primitives from UI tasks

## In scope

- Extract a credential-form component with typed, non-nullable form state and semantic submit output.
- Extract SSO/provider choice presentation from credential submission.
- Move login orchestration into the canonical auth facade/use-case layer.
- Represent login states/transitions explicitly, including handoff to MFA and SSO/redirect flows.
- Remove raw storage/session/fingerprint transport coordination from the page.
- Add tests for credential success/failure, MFA handoff, SSO selection, redirect and cancellation/latest-attempt behavior.

## Out of scope

- Do not redesign backend auth endpoints or provider policies.
- Do not introduce a second auth facade/state machine.
- Do not change MFA strategy internals owned by `0093`.
- Do not change global error catalog semantics beyond consuming the canonical mappings.

## Decisions already made

- `authenticated` and session state come from the canonical auth/session store.
- Redirect-after-login is one-shot and same-origin through the canonical redirect store.
- Fingerprint/pre-auth/session persistence are adapters behind auth commands, not component responsibilities.
- Credential and SSO UI are separate presentation units even if rendered on the same route.

## Requirements

1. Keep `LoginPageComponent` free of `HttpClient`, raw storage/cookie access and direct session mutation.
2. Make repeated/overlapping login attempts deterministic; stale responses cannot win.
3. Preserve provider selection and handoff to `/login/mfa` where required.
4. Clear prior ephemeral auth errors on a new attempt according to the canonical lifecycle.
5. Preserve accessibility, validation and pending states through canonical UI primitives.
6. Cover redirect sanitization/consumption integration in tests.

## Acceptance criteria

- [ ] Credential form and SSO chooser are independently testable presentation components.
- [ ] Login page delegates orchestration to the canonical auth facade.
- [ ] No component-level raw auth persistence or HTTP calls remain.
- [ ] Credential, SSO and MFA-handoff flows preserve existing behavior.
- [ ] Concurrent/repeated attempts cannot produce stale final session state.

## Validation

Run focused login/auth facade integration tests plus canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise invalid credentials, valid non-MFA login, MFA handoff where available, SSO provider entry, redirect-after-login and repeated submit behavior. Inspect network/state/focus/error UI and confirm no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a provider/login transition conflicts with the canonical auth protocol established by earlier tasks and resolving it requires a security/product decision.

## Dependencies

- FE auth/session/redirect/pre-auth tasks through `0038` must be `DONE`.
- `0093` must be `DONE` for the MFA handoff target contract.

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
