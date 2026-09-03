# 0131 - Make environment validation bootstrap-safe and testable

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Remove `process.exit(1)` and import-time process termination from environment validation; invalid configuration must produce a typed validation error at the explicit application-bootstrap boundary while tests can inject isolated configuration safely.

Source: `BE-017` in Series `0001`.

## Context

`src/config/env-validation.ts` currently prints validation errors and calls `process.exit(1)`. `AppModule` wires that function into `ConfigModule.forRoot({ validate })`, so importing/compiling the application module with an incomplete test environment can terminate Jest instead of returning a normal test failure. Task `0001` Phase 0 may already have repaired the immediate CI blocker; this task must ensure the final architecture satisfies the stronger invariant even if part of the defect was fixed early.

## Relevant files and modules

- `MercurionWebNode/src/config/env-validation.ts`
- canonical schema introduced by `0130`
- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/main.ts`
- Nest test application/config utilities
- module/bootstrap/config specs

## In scope

- Replace validation-side console/process termination with a typed `ConfigurationError` (or equivalent) carrying structured validation diagnostics.
- Ensure validation functions are pure with respect to process lifecycle: no `process.exit`, no global mutation and no logging side effect required for correctness.
- Catch/present configuration failure at the explicit bootstrap entrypoint and set/allow the process to exit non-zero through normal startup failure semantics.
- Provide a test configuration builder/module so unit/module tests do not depend on developer machine env files.
- Ensure importing config modules/types never terminates the process.
- Add regression tests spying on process exit and testing invalid/valid bootstrap behaviour.

## Out of scope

- Do not suppress invalid configuration to make tests pass.
- Do not create permissive test defaults that production code can accidentally use.
- Do not decide unknown `APP_ENV` fallback here; `0132` owns fail-closed environment-name resolution.
- Do not swallow bootstrap errors and continue with partial config.

## Decisions already made

- Validation reports errors by throwing/returning typed failure, never by terminating the process itself.
- Only the application entrypoint owns process lifecycle/exit semantics.
- Tests receive explicit isolated configuration and can assert validation failures as ordinary exceptions/results.
- Production startup remains fail-fast on invalid required configuration.

## Requirements

1. Replace `validateEnvOrKillProcess` semantics/name with a pure typed validation boundary.
2. Remove all `process.exit()` calls from config validation/import paths.
3. Make bootstrap log/report structured safe diagnostics and fail startup with a non-zero process result naturally.
4. Add reusable test configuration fixtures/builders that satisfy required schema fields without loading production secrets.
5. Ensure AppModule/module-compilation tests can exercise valid and invalid config without process termination.
6. Add a guard/static test that prevents future `process.exit` usage in importable configuration modules.
7. Re-run the complete Nest Jest suite that originally failed because environment validation terminated imports.

## Acceptance criteria

- [ ] Importing any Nest config/module file cannot terminate the Node process.
- [ ] Invalid environment data produces a typed, testable configuration failure.
- [ ] Real application bootstrap fails fast/non-zero on invalid required config.
- [ ] Tests can inject isolated config without depending on production/dev env files.
- [ ] No `process.exit()` remains in configuration validation code.
- [ ] Full Nest test suite executes to completion rather than being aborted by env validation.

## Validation

Run config validation/bootstrap tests including explicit `process.exit` spies, `npm test`, `npm run test:e2e`, `npm run build`, and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a test currently relies on production credentials/secrets rather than an isolated configuration contract and safely replacing that dependency requires a broader integration-test infrastructure decision.

## Dependencies

- `0130-define-every-nest-configuration-property-once.md` must be `DONE`.

## Implementation notes

If Phase 0 of task `0001` already removed the direct `process.exit` blocker, verify the final code against every acceptance criterion and complete any missing architectural/test isolation work rather than treating this task as automatically done.

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
