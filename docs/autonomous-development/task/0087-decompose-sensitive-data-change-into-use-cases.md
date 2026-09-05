# 0087 - Decompose sensitive-data change into independent use cases

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
Not attempted because the required FE auth/action-session prerequisite work
through task 0058 is terminally non-`DONE`.

### Task-specific validation performed
Not applicable; no feature branch or implementation worker was created.

### Full pre-merge CI-parity validation
Not applicable; dependency-skip metadata only.

### Browser validation performed
Not applicable; the task was not attempted.

### Commits
Pending metadata commit on `develop`.

### Merge / CI
No feature branch or merge. Exact-SHA CI is required for the metadata commit.

### Rollback
_Not applicable._

### Blocker / human decision required
The required FE auth/action-session work includes FE-004 (task 0026),
`BLOCKED` because mandatory authenticated browser validation was unavailable,
and its terminal dependent tasks. FE-004 requires a test-safe canonical local
auth/backend runtime and approved deterministic test state in a new session.
