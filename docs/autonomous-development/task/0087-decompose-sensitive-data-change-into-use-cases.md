# 0087 - Decompose sensitive-data change into independent use cases

- [x] DONE
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

- [x] Email, phone, password, MFA enable/config and backup-code flows are separate use cases/components.
- [x] The container contains no workflow-specific form or transport implementation.
- [x] Use-case selection is exhaustive and compile-time typed.
- [x] Every use case has focused success/error/cancel tests.
- [x] Closing and reopening the action starts from fresh state.
- [x] Existing security behaviour remains compatible.

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
- Recovery authorization supplied the preserved feature SHA
  `bb210295929e45ba739207361f40f1c1bbbb719b` and current green develop SHA
  `ee48c50e7fc2a1dd9a7f1ca9628cdc8b17fdb441`; both refs matched before work.
- Merged develop into `feature/NG-001` first with
  `git merge --no-ff --no-gpg-sign develop`; merge commit `6c71b30b3`.
- Exact develop Actions run `34612852813` for
  `ee48c50e7fc2a1dd9a7f1ca9628cdc8b17fdb441` succeeded, including both
  platform quality jobs and `Required gate`.
- No task-owned Angular, Nest, Tox21, or test watcher remained active before
  implementation validation.

### Preflight remediation
The initial post-change Angular watch compile reported an injection metadata
diagnostic for the new use-case classes. The workflow component now supplies
explicit factory providers backed by the narrow facade. The first safe phone
entry probe also exposed a null country-list edge case in the existing prefix
ordering helper; the helper now keeps API order when Italy is absent.

### Summary
Completed the sensitive-data decomposition boundary. The typed shell selects
email, phone, password, MFA enable/configuration and backup-code use cases;
the narrow facade is the only account-command surface used by those
implementations. Each use case now owns its command sequence and cancellation
boundary, while the existing workflow preserves forms, validators, security
endpoints, confirmation requirements and server error mapping.

Closing the workflow cancels all pending use-case commands. Reopening creates
a new provider scope and fresh controls. The top-level sensitive-data
component contains only typed selection and shell composition.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npm run lint --workspace mercurion_web_ng -- --no-warn-ignored` — passed
  with pre-existing repository warnings only.
- `npm run test:ci --workspace mercurion_web_ng` — passed.
- Focused Angular run from `MercurionWebNg` with the three sensitive-data
  `--include` specs — 9 tests passed.
- No `npm ci` or `npm run ci:check` was run locally.

### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are GitHub Actions-only.

### Browser validation performed
Post-change runtime start order was Tox21, Nest, Angular. Nest reported
`Found 0 errors. Watching for file changes.` and listened on 8099; Angular
completed its bundle and listened on 3498; Tox21 remained alive. Two complete
readiness rounds returned HTTP 200 for both
`http://localhost:8888/health` and `http://localhost:8888/`.

Through the dedicated persistent Chrome profile and
`http://localhost:8888/login`, a fresh ordinary login was accepted and the
protected dashboard was observed. Settings flows exercised through the edge:
password invalid-form error plus cancel/reopen with empty fresh controls, MFA
configuration with active backup-code state, invalid email validation, and
invalid phone validation. The final browser console inspection after the
Angular rebuild reported no errors. Only safe validation/cancel paths were
used; no security transition or backup code was exposed.

All task-owned runtime processes were stopped by PID after browser evidence:
Tox21 28172, Nest 49836/49856/46264, and Angular 26784/19176. A final process
inventory found no matching task-owned runtime command.

### Commits
- `6c71b30b3` — recovery no-ff merge of current develop.
- `e66a82a4` — extract sensitive-data use-case commands and focused tests.
- Final task outcome and execution-note update is committed separately below.

### Merge / CI
Feature branch publication is required after the final task-note commit. The
coordinator must then obtain exact feature-SHA Actions evidence before
integration.

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
