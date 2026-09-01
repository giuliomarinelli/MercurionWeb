# 0107 - Centralize typed HTTP form-error mapping

- [ ] DONE
- [ ] BLOCKED

## Objective

Create one typed form-error adapter for Angular HTTP/application errors so login, registration, recovery and account forms consume the same field/global error model instead of duplicating response parsing and reset behavior.

Source: `NG-021` in Series `0001`.

## Context

HTTP/application errors are interpreted in multiple components and flows using local `HttpErrorResponse`/`HttpErrorBody` casts, status/message branches and ad-hoc UI state. Earlier system tasks establish the canonical transport error envelope/code catalog; auth tasks establish typed ephemeral auth error state. This task translates those canonical application errors into form-facing state without creating a second error taxonomy.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/http-error-body.dto.ts` or its canonical successor
- login, register, password/account-recovery pages
- settings/account-sensitive-data flows
- auth/account facades introduced by earlier FE/NG tasks
- canonical error contracts from `SYS-011` / `SYS-012`

## In scope

- Define a typed `FormErrorState`/equivalent containing field errors, global/public error and optional retry/action metadata.
- Implement one pure/testable adapter from canonical application error to that form state.
- Define explicit field-name mapping at each form boundary when API/domain names differ from control names.
- Migrate login, register, recovery and account-management forms away from local status/message parsing.
- Standardize reset lifecycle: new submit clears stale submit errors while client validation remains intact.
- Preserve unknown/unmapped errors as a safe global fallback without exposing private backend detail.

## Out of scope

- Do not replace canonical application error codes/envelopes established by SYS tasks.
- Do not make the adapter navigate, toast, perform HTTP, or mutate unrelated session state.
- Do not identify errors by human-readable message text when a stable code exists.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Producer/transport errors and UI form errors are separate typed layers.
- Stable application error codes drive mapping; HTTP status alone is insufficient where a code exists.
- Field errors are attached only to controls that exist in the target form; the remainder becomes global state.
- A new submission cannot display stale server errors from a previous attempt.

## Requirements

1. Inventory duplicated server-error parsing across login/register/recovery/account forms.
2. Introduce a pure adapter with exhaustive mappings for known relevant application codes.
3. Support typed per-form control-key maps without `string -> any` mutation.
4. Make field/global state easy to consume from typed reactive forms/facades.
5. Remove local parsing branches made redundant by the adapter.
6. Add table-driven tests for every mapped code, unknown code, malformed payload and field mismatch.

## Acceptance criteria

- [ ] Target forms no longer duplicate `HttpErrorResponse`/message parsing logic.
- [ ] Known application codes map deterministically to typed field/global errors.
- [ ] Unknown/malformed errors render a safe global fallback.
- [ ] New submits clear stale server errors consistently.
- [ ] No private/internal backend details are surfaced by fallback behavior.
- [ ] Mapping is covered by table-driven tests.

## Validation

Run adapter unit tests and focused login/register/recovery/account form tests, then canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise representative invalid login, registration validation, recovery failure and account-change failure/success flows. Verify field association, global errors, retry/reset behavior and absence of stale errors.

## Stop conditions

Mark `BLOCKED` if a form relies on backend message text because no stable canonical error code exists after `SYS-011`/`SYS-012`; add the missing contract decision rather than inventing a UI-only code.

## Dependencies

- `SYS-011` and `SYS-012` must be `DONE`.
- Auth/form facades created by earlier FE/NG tasks must remain the owners of flow state.

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
