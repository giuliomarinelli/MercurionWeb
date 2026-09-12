# 0094 - Decompose login flow behind the canonical auth facade

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

- [x] Credential form and SSO chooser are independently testable presentation components.
- [x] Login page delegates orchestration to the canonical auth facade.
- [x] No component-level raw auth persistence or HTTP calls remain.
- [x] Credential, SSO and MFA-handoff flows preserve existing behavior.
- [x] Concurrent/repeated attempts cannot produce stale final session state.

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
`feature/NG-008`, based on `aa8756c49b9fca1ae3ea6161eb9b30b955a5d1e8`.

### Preflight
Passed on 2026-09-12. The branch was clean and exactly matched the supplied
NG-007 merge base. GitHub Actions run `34668983978` for the exact base SHA
completed successfully. No workspace-consuming process was active before the
task-scoped runtime probe. Tox21, Nest and Angular were started in the
canonical order; Nest reported zero compile errors and Angular reached watch
mode.

### Preflight remediation
_None._

### Summary
Implemented the login composition boundary. `LoginPageComponent` now only
composes presentation components and delegates fingerprint preparation,
credential orchestration, session activation, MFA handoff, redirect
consumption, error lifecycle and SSO entry to `AuthFacade`. Credential entry
uses non-nullable typed controls; provider choice is an independently
testable component. `AuthFacade` filters stale attempts so an older response
cannot install session state after a newer attempt begins.

### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_ng`
- `npx ng test --watch=false --karma-config=karma.conf.js --include 'src/app/pages/login/**/*.spec.ts'`
  (11/11 tests passed)
- `node scripts/check-angular-interactive-semantics.mjs` (passed after the
  narrow CI correction removing the unnecessary SSO anchor click handler).
- `node scripts/check-angular-component-change-detection.mjs` (passed).
- Canonical post-edit runtime restarted with Tox21, Nest and Angular in order;
  two consecutive `/health` and `/login` readiness rounds returned HTTP 200.
- Through `http://localhost:8888/login`, invalid credentials rendered the
  accessible email error state and a 401 response; the configured non-MFA
  test account completed ordinary login and reached protected `/dashboard`.
  The final authenticated page had no relevant browser console errors.
- Runtime processes started by this task were stopped after browser evidence;
  only the dedicated Chrome DevTools MCP process remained.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are reserved for
GitHub Actions. Exact feature-SHA CI is required after publication.

### Browser validation performed
Invalid credentials, pending state, provider links, ordinary non-MFA login,
redirect to `/dashboard`, protected dashboard state, network responses and
console state were inspected through the dedicated persistent Chrome profile
at `http://localhost:8888`. MFA was not available for the configured account
during this run.

### Commits
`6209abf2aebcd4461c3d307e2a10e9a7cc059fb5` — feature implementation.
`235d3799db044ee32f1dcc4cae62c32fe77b2e12` — first CI repair. Exact feature
run `34669933775` found the interactive-semantics violation in the SSO anchor;
run `34670332658` then found the repository policy forbidding an unused
production `EventEmitter` output in the chooser. `dfa868e7523c38746fefaa884f4c728971538732`
is the second CI repair; run `34670718683` additionally identified the
modern-component-API requirement, which is addressed by the final narrow
conversion of both extracted components to functional input/output APIs.

### Merge / CI
The feature branch must be published after the task-specific commit. The
coordinator must wait for exact feature-SHA CI before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
