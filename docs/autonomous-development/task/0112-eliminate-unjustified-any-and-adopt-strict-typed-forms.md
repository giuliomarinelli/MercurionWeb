# 0112 - Eliminate unjustified any and adopt strict typed Angular forms

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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
`feature/NG-026`
### Preflight
Base `develop` SHA `8b1e08b9c979a6c97f7d89395162d5d356ef3cd9` matched the assigned feature
branch. GitHub Actions run `35526582968` was a successful `full` run with Windows,
Linux and `Required gate` green. The worktree was clean before mutation and
`commit.gpgSign=false` was verified.

The non-navigating Chrome DevTools probe succeeded. The canonical runtime was
started in the required order (Tox21, NestJS, Angular), with live attached
handles before HTTP probing. The nginx edge returned two consecutive successful
`200` rounds for `/health` and `/` through `http://localhost:8888`. The
dedicated persistent profile completed a fresh ordinary login through `/login`
with the local test account, and the protected Dashboard displayed the
authenticated identity. All preflight runtime processes were stopped before
implementation.
### Preflight remediation
_None._
### Summary
Removed unjustified production Angular `any` usage and unsafe non-null
assertions at GraphQL, browser-global, form-control, query-parameter, JWT,
Quill, CVA, ticket and molecule boundaries. Added JSON/unknown narrowing for
untyped external values, migrated affected reactive forms to explicit typed
non-nullable controls/groups, and enabled `@typescript-eslint/no-explicit-any`
for production source. Added a deterministic machine-readable typing scan with
negative fixtures for explicit `any` and untyped forms, and registered it in
the canonical CI aggregate.
### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_ng`
- `npm run lint:angular --workspace mercurion_web_ng`
- `npm run ci:angular:typing` (zero production violations plus negative fixtures)
- `npx ng test --watch=false --karma-config=karma.conf.js --include src/app/components/action-components/sensitive-data-change/sensitive-data-change.use-cases.spec.ts --include src/app/pages/account-recovery/account-recovery.page.component.spec.ts --include src/app/pages/login/mfa/mfa.page.component.spec.ts` (`17` specs passed)
- `git diff --check`

The post-implementation runtime rebuilt successfully. Browser evidence through
the nginx edge covered the authenticated Dashboard, collection search and
collection detail GraphQL views, Settings contact/security forms and MFA
strategy/session state. No browser console errors were reported. All
task-owned runtime processes were stopped after validation.
### Full pre-merge CI-parity validation
The complete clean-install aggregate remains GitHub Actions-only by policy.
The exact base-SHA full run was green in preflight; the final feature-SHA gate
is pending coordinator observation.
### Browser validation performed
Passed through `http://localhost:8888` using the dedicated persistent
non-production profile. Protected state was server-accepted and rendered as
the authenticated Test account. Representative collection, search, account
settings and MFA surfaces rendered without console errors.
### Commits
`5134c26e7` — `NG-026 enforce strict Angular typing boundaries`
### Merge / CI
No merge performed by the worker. The final feature SHA is pushed for exact-SHA
CI observation by the coordinator.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
