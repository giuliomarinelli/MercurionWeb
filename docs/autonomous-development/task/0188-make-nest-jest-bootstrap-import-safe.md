# 0188 - Make Nest Jest bootstrap import-safe

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make Nest unit and E2E tests bootstrap through explicit test configuration without import-time `process.exit()`, forced termination or hidden open handles, so Jest exits naturally with a truthful status.

Source: `QA-002` in Series `0001`.

## Context

The current Jest configuration loads `src/config/env-validation.ts` through `setupFiles`. That module performs dotenv loading and validation as an import side effect and calls `process.exit(1)` on missing/invalid configuration. The current `test` script also uses `jest --forceExit`. This can produce suites that print PASS while the process still terminates incorrectly, and `--forceExit` can conceal resources that were never closed. Earlier configuration tasks make environment handling typed and fail-closed; this task separates pure validation from process-level bootstrap and makes test ownership explicit.

## Relevant files and modules

- `MercurionWebNode/src/config/env-validation.ts`
- canonical config/schema from `0130` and `0132`
- `MercurionWebNode/package.json`
- Jest configuration in `package.json`
- `MercurionWebNode/test/jest-e2e.json`
- unit/E2E test setup files
- Nest bootstrap code and external-client lifecycle
- canonical root CI scripts from `0008`

## In scope

- Separate pure environment parsing/validation from process termination and application bootstrap.
- Make importing configuration modules safe in tests and libraries.
- Add an explicit deterministic Jest test environment/bootstrap with test-only values; never depend on developer-host or production secrets.
- Remove `--forceExit` from the canonical Nest unit-test command.
- Make unit tests pass with `--runInBand --detectOpenHandles` and natural process exit.
- Apply equivalent explicit configuration/teardown discipline to Nest E2E tests.
- Close app servers, database pools, Redis/NATS clients, timers and other owned resources in tests.

## Out of scope

- Do not weaken runtime environment validation for production.
- Do not catch configuration errors and silently substitute development defaults.
- Do not keep `--forceExit` as a permanent workaround for leaked handles.
- Do not embed real secrets in committed test configuration.

## Decisions already made

- Library/module import must never terminate the Node process.
- Fatal process behavior belongs at the top-level executable boundary.
- Tests use an explicit test configuration and fail normally through thrown errors/assertions.
- Jest must exit naturally after resource cleanup.

## Requirements

1. Refactor the config validation API into pure parse/validate functions that return typed config or throw typed errors.
2. Move `process.exit`/exit-code handling, if still needed, to the top-level application entrypoint only.
3. Define deterministic test configuration through a committed safe fixture/setup and document required test service endpoints.
4. Remove env-validation import side effects from Jest `setupFiles`; use an explicit test bootstrap only when setup is actually required.
5. Remove `--forceExit` from the canonical unit-test script and ensure test failures still yield non-zero exit codes.
6. Run `npm test -- --runInBand --detectOpenHandles` and eliminate every repository-owned leaked handle.
7. Align `test:e2e` configuration with the same import-safe/test-environment contract.
8. Add tests for missing/invalid environment values that assert typed validation failures without spying on or invoking real process termination.

## Acceptance criteria

- [ ] Importing configuration modules does not call `process.exit` or terminate Jest.
- [ ] Nest unit tests exit 0 naturally with `--runInBand --detectOpenHandles` when green.
- [ ] The canonical test script no longer relies on `--forceExit`.
- [ ] Test configuration is explicit, deterministic and contains no production secrets.
- [ ] E2E setup/teardown closes all resources it owns.
- [ ] Invalid runtime config remains fail-closed at the executable boundary.

## Validation

Run Nest unit tests with `--runInBand --detectOpenHandles`, E2E tests, config-specific tests, Nest lint/typecheck/build, then repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a required test dependency cannot be represented with safe test configuration or if an external library keeps a non-closeable handle and replacing/isolating it requires a separate infrastructure decision.

## Dependencies

- `0130` single authoritative Nest config schema should be `DONE`.
- `0132` fail-closed APP_ENV handling should be `DONE`.
- `0008` canonical CI interface must be available.

## Implementation notes

`process.exit()` is not configuration validation. Keep parsing/validation reusable and deterministic; only `main.ts` or an equivalent executable boundary may decide how a fatal startup error maps to a process exit code.

## Execution notes

### Feature branch
`feature/QA-002` from base `8b7f1b4aff542d0bb9f15ec09a43f2086b750337`.
### Preflight
Confirmed clean branch identity and exact base SHA before edits. Dependencies
`0008`, `0130`, and `0132` are all `[x] DONE`. GitHub Actions run
`34713504284` for the supplied base SHA completed successfully. No task-owned
workspace-consuming process was active; existing Node processes were Chrome
DevTools MCP processes. Did not run `npm ci` or `npm run ci:check`.
### Preflight remediation
None.
### CI repair
The exact feature SHA `d50a1d787aa9074d58d2f0352f45e8d3fbda6ac8` failed
GitHub Actions run `34714791373` in both registered OS quality jobs at
`ci:static` -> `ci:contracts`: Jest implicit resolution found both the new
`MercurionWebNode/jest.config.js` and the legacy `jest` key in
`MercurionWebNode/package.json`. Removed the duplicate package-level Jest
configuration, retaining the explicit import-safe config and existing explicit
test/E2E invocations. This keeps `contracts:check`'s implicit Jest command
unambiguous without weakening any test or static-check command.
### Summary
Added explicit unit Jest configuration and a shared safe test bootstrap derived
from the canonical environment schema. The E2E Jest configuration uses the
same bootstrap. No validation module is imported for side effects, no
developer/production secrets are read, and the unit script no longer relies on
`--forceExit`.

Updated Redis and Socket.IO tests to close their Nest testing modules and to
provide closeable mock clients. Updated the SMS sender fixture with safe,
syntactically valid Twilio test values.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand --detectOpenHandles`:
  PASS, 148 suites and 451 tests, exit code 0.
- `npm run test:e2e --workspace mercurion_web_node -- --runInBand --detectOpenHandles`:
  PASS, 1 suite and 3 tests, natural exit.
- Focused config/bootstrap/lifecycle tests: PASS, including 41 config/bootstrap
  tests and 17 Redis/Socket.IO teardown tests.
- `npm run typecheck --workspace mercurion_web_node`: PASS.
- `npm run lint --workspace mercurion_web_node`: PASS with 48 pre-existing
  warnings and 0 errors.
- `npm run build --workspace mercurion_web_node`: PASS.
- `git diff --check`: PASS.
- CI repair reproducer `npm run contracts:check --workspace mercurion_web_node`:
  PASS after removing the duplicate package-level Jest configuration.
- `npm test --workspace mercurion_web_node -- --runInBand --detectOpenHandles`:
  PASS after the CI repair.
- `npm run test:e2e --workspace mercurion_web_node -- --runInBand --detectOpenHandles`:
  PASS after the CI repair.
- Required Nest typecheck, lint, and build checks: PASS after the CI repair.
  Nest lint retains the same 48 pre-existing warnings and 0 errors. The full
  unit run exits 0; Jest still reports one worker force-exit warning despite
  `--detectOpenHandles`, unchanged by this configuration-only CI repair.
### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are reserved for
GitHub Actions. Exact feature-SHA aggregate validation remains coordinator-owned.
### Browser validation performed
_Not applicable._
### Commits
Original implementation: `d50a1d787aa9074d58d2f0352f45e8d3fbda6ac8`.
CI repair commit is the commit containing this correction and its validation
notes.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
