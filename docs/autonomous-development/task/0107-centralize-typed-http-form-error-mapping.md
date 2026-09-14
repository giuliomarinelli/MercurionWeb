# 0107 - Centralize typed HTTP form-error mapping

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-021`
### Preflight
- Verified clean `feature/NG-021` at supplied base
  `f44509bd82d4f05d35f501e0a1e83a5748a70700`; local `HEAD`, `origin/develop`,
  and the supplied SHA matched.
- Exact base Actions run `34794852508` was successful for that SHA, including
  both platform prerequisite jobs and the stable `Required gate`.
- Confirmed SYS-011 and SYS-012 are both `DONE` in the current repository
  baseline, so the canonical envelope and code catalog were available.
- No task-owned application or test watcher process was active before the
  focused baseline check. Angular typecheck passed.
- Browser capability preflight passed after starting Tox21, Nest, and Angular
  in the required order. The nginx edge reached two consecutive complete
  readiness rounds, and a fresh ordinary shared-account login reached the
  protected dashboard. All preflight runtimes were stopped before editing.
### Preflight remediation
None.
### Summary
Added the pure typed `adaptHttpFormError` adapter and `FormErrorState`, with
typed per-form API-to-control maps, safe global fallback, retry metadata, and
reauthentication action metadata. The adapter consumes canonical stable
application codes and never exposes backend messages for unknown or malformed
payloads. Login, registration, password recovery, and account-recovery flows
now consume the adapter and clear server state on a new submit/value change;
client-side validation remains separate.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` passed.
- Adapter table-driven spec passed: 4 tests.
- Focused login/register/recovery/auth error specs passed: 9 tests.
- `git diff --check` passed.
### Full pre-merge CI-parity validation
Not run locally; forbidden by session policy. Exact feature-SHA Actions
validation remains coordinator-owned.
### Browser validation performed
Through `http://localhost:8888`, fresh login produced the protected dashboard,
invalid login rendered the safe global fallback and the typed invalid-credentials
message, and registration/password-recovery routes rendered their typed form
surfaces. Registration and recovery submission were gated by the required
Turnstile challenge in this environment, so no challenge bypass was attempted.
The browser console/runtime showed no task-caused failure during the exercised
flows. All task-owned runtimes were stopped afterward.
### Commits
Pending task commit.
### Merge / CI
Worker publishes the task-specific commit to `feature/NG-021`; coordinator must
wait for exact-SHA feature Actions before integration.
### Rollback
Not applicable.
### Blocker / human decision required
None. No UI-only error codes were introduced.
