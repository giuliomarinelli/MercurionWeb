# 0112 - Eliminate unjustified any and adopt strict typed Angular forms

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

## Objective

Bring production Angular code to a strict, explicit type boundary: eliminate unjustified explicit/implicit `any`, replace unsafe non-null assertions, and migrate forms to typed non-nullable APIs where null is not a domain value.

Source: `NG-026` in Series `0001`.

## Context

The Series baseline identified 98 occurrences spanning `any`, non-null assertions and partially typed forms. Examples include GraphQL response fields typed as `any`, socket acknowledgements/reasons, error parsing, component helper return values and generic form/query objects. Earlier contract-generation, auth/session, GraphQL and modern-Angular tasks should now provide the real types needed to remove these escape hatches.

## Relevant files and modules

- `MercurionWebNg/src/app/**/*.ts`
- Angular reactive forms in auth/account/search/action flows
- generated REST/GraphQL/socket contracts from SYS tasks
- error/session/query models introduced by earlier FE/NG tasks
- Angular/TypeScript/ESLint configuration and root CI aggregate

## In scope

- Enable/confirm strict TypeScript options applicable to the Angular application without weakening existing checks.
- Remove explicit `any` from production Angular code except a documented unavoidable external boundary.
- Replace unsafe non-null assertions with narrowing, discriminated unions, required inputs or explicit error states.
- Migrate reactive forms to typed `FormGroup`, `FormControl` and `FormBuilder.nonNullable`/equivalent where null is not meaningful.
- Replace `any` at third-party boundaries with `unknown` plus runtime/type guards or typed adapters rather than blind casts.
- Add deterministic lint/type gates preventing regression.

## Out of scope

- Do not mechanically replace `any` with `unknown as SomeType` without validation.
- Do not invent non-null defaults for domain values that are genuinely optional/null.
- Do not change backend semantics merely to satisfy the frontend compiler.
- Do not include test mocks/fixtures in a zero-`any` policy where framework typing makes a narrowly documented exception necessary, unless production types leak from them.

## Decisions already made

- Production application code has no unjustified `any`.
- External/untyped data is `unknown` until validated at a boundary.
- Form nullability models domain semantics, not Angular defaults.
- Exceptions, if truly unavoidable, are path/symbol-specific and machine-readable; blanket ESLint disables are forbidden.

## Requirements

1. Produce a machine-readable baseline scan of explicit `any`, unsafe assertions and untyped forms in production Angular source.
2. Resolve findings using generated contracts, discriminated unions, generic constraints, runtime guards or typed adapters.
3. Convert form groups/controls to strongly typed definitions and remove cast-based control access.
4. Enable an ESLint/TypeScript gate such as `no-explicit-any` plus appropriate strict compiler options, with zero production violations or narrowly justified allowlist entries.
5. Add negative fixtures/tests proving the CI gate rejects a new production `any` and an untyped form regression.
6. Register the typing gate in `ci:check`.

## Acceptance criteria

- [ ] Production Angular compiles under the approved strict configuration.
- [ ] No unjustified explicit/implicit `any` remains in production Angular source.
- [ ] Unsafe non-null assertions are removed or narrowly justified by a proven invariant.
- [ ] Reactive forms use typed controls/groups with correct nullability.
- [ ] Untyped external values are validated/narrowed before use.
- [ ] CI rejects newly introduced typing escape hatches.

## Validation

Run Angular typecheck, lint, focused typed-form tests and canonical CI-parity gates. Prove the new gate with a temporary negative fixture before removing it.

## Browser validation

Through `http://localhost:8888`, exercise representative login/MFA/account forms, collection actions, search and GraphQL-heavy pages to verify validation, submit/reset and optional-state behavior did not regress.

## Stop conditions

Mark `BLOCKED` if removing a type escape requires a missing canonical contract or an unresolved distinction between valid domain variants; fix/clarify the boundary rather than fabricating a type.

## Dependencies

- Contract-generation and error/session/socket tasks from SYS/FE must be `DONE`.
- `0099`, `0107`, `0109` and `0110` should provide the typed GraphQL/error boundaries consumed here.

## Execution notes

### Feature branch
_Not started._
### Preflight
_Not started._
### Preflight remediation
_None._
### Summary
Not attempted because required SYS/FE contract, error, session, and socket
foundation tasks are terminally non-`DONE`. References to tasks 0099, 0107,
0109, and 0110 are advisory.
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
The required foundation includes SYS-011 (`SKIPPED_DEPENDENCY`) and FE-004
(`BLOCKED` because mandatory authenticated browser validation was unavailable),
with terminal dependent session/socket tasks. FE-004 requires a test-safe
canonical local auth/backend runtime and approved deterministic test state in a
new session.
