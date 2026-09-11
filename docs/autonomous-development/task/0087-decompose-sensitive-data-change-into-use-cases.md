# 0087 - Decompose sensitive-data change into independent use cases

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the monolithic sensitive-data action with independent email, phone, password, MFA enable/configuration and backup-code use cases behind one thin facade/container, so no workflow-specific form or branching remains in the container.

Source: `NG-001` in Series `0001`.

## Context

The audited `sensitive-data-change.component.ts` is roughly 1.5k lines and owns several unrelated security workflows. It consumes `SensitiveDataChangeInnerScope` and the action context, while `SettingsPageComponent` opens the same action with scopes such as `EnableMfa` and `ConfigMfa`. Earlier FE/UI tasks establish isolated action sessions, typed state, canonical form controls and action-card/dialog primitives; this task must build on those contracts rather than recreate them.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/sensitive-data-change/sensitive-data-change.component.ts`
- `MercurionWebNg/src/app/components/action-components/sensitive-data-change/sensitive-data-change.component.spec.ts`
- `MercurionWebNg/src/app/services/context/action-context/sensitive-data-change-context.service.ts`
- `MercurionWebNg/src/app/Models/action/action-overlay.models.ts`
- account/auth services and models used by the current workflows
- canonical action/dialog/form primitives created by tasks `0059`-`0076`

## In scope

- Introduce a feature-local facade/state contract for the sensitive-data action.
- Split email, phone, password, MFA enable/configuration and backup-code flows into independent use-case components/services.
- Make the top-level sensitive-data component select/render a typed use case and compose the common shell only.
- Move workflow-specific forms, validators, transport calls, pending/error state and success mapping out of the container.
- Preserve all currently supported security flows and action-session semantics.
- Add focused tests per use case plus facade/container tests.

## Out of scope

- Do not redesign backend authentication/security protocols.
- Do not weaken MFA, re-authentication or confirmation requirements.
- Do not change unrelated settings-page structure; task `0088` owns that decomposition.
- Do not introduce another global auth store or action-context system.

## Decisions already made

- Workflow selection is typed and exhaustive; raw string branching is not the target architecture.
- Each workflow owns its form and workflow-specific state.
- Shared action shell/form primitives from the UI series must be reused where applicable.
- The container must not become a service locator that merely moves a large switch from template to TypeScript.

## Requirements

1. Define a discriminated use-case model for every supported sensitive-data operation.
2. Keep each workflow implementation independently testable without instantiating the full action container.
3. Route shared account/auth commands through a narrow facade API.
4. Ensure cancellation/close destroys pending workflow state and cannot leak payload into the next action session.
5. Preserve authorization/re-authentication/MFA requirements and server error semantics.
6. Keep the top-level component free of workflow-specific `FormGroup`/`FormControl`, HTTP calls and success/error branches.

## Acceptance criteria

- [ ] Email, phone, password, MFA enable/config and backup-code flows are separate use cases/components.
- [ ] The container contains no workflow-specific form or transport implementation.
- [ ] Use-case selection is exhaustive and compile-time typed.
- [ ] Every use case has focused success/error/cancel tests.
- [ ] Closing and reopening the action starts from fresh state.
- [ ] Existing security behaviour remains compatible.

## Validation

Run focused Angular tests for the new sensitive-data facade/use cases, then the canonical `npm ci` + `npm run ci:check` gates.

## Browser validation

Through `http://localhost:8888`, exercise every currently reachable sensitive-data flow from Settings: open, validation error, cancel/reopen, successful transition up to the point allowed by local test data, and verify focus/error/pending state with no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a workflow's required security semantics are ambiguous or cannot be exercised safely with the available local environment/test data.

## Dependencies

- FE auth/action-session work through `0058` must be `DONE`.
- Canonical UI action/form primitives used by this flow must be available.

## Execution notes

### Feature branch
`feature/NG-001`

### Preflight
- Verified clean `feature/NG-001` at base
  `e8029fe85ee0bc3caf57fc5d73042aec10a7b425`.
- Exact base Actions run `34592437741` succeeded for both platform quality
  jobs and `Required gate`.
- The canonical Tox21, Nest, and Angular processes started in the required
  order; two readiness rounds returned HTTP 200 for `/health` and `/`.
- Fresh ordinary login through `/login` was accepted and protected
  dashboard/settings state was observable.

### Preflight remediation
_None._

### Summary
Added a typed sensitive-data use-case model, a narrow account-command facade,
an explicit use-case selection shell, and composition boundaries for email,
phone, password, MFA enable/configuration, and backup-code workflows.

The task remains `BLOCKED`: the moved workflow implementation is still
monolithic internally, so independently testable workflow implementations and
focused success/error/cancel tests for every use case were not restored within
this attempt. The partial implementation is preserved on the feature branch.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npm run test:ci --workspace mercurion_web_ng` — 376 tests passed.
- Browser validation covered fresh login, protected dashboard, Settings >
  Security, password validation error, cancel/reopen fresh state, and MFA
  configuration through `http://localhost:8888`.

### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are GitHub Actions-only.

### Browser validation performed
Canonical runtime processes were started and stopped cleanly for capability
and post-change validation. Protected login was accepted; safe sensitive-data
entry points were reachable without exposing credentials or weakening
security flows.

### Commits
Partial implementation and status are preserved on `feature/NG-001`.

### Merge / CI
No feature merge. The preserved feature branch remains frozen for follow-up.

### Rollback
_Not applicable._

### Blocker / human decision required
Continue the decomposition inside
`sensitive-data-change-workflow.component.ts`: extract each workflow's form,
transport, pending/error state, success mapping, and focused success/error/
cancel tests into independently testable use-case implementations.
