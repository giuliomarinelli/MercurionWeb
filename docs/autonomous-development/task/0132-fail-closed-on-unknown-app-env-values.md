# 0132 - Fail closed on unknown APP_ENV values

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make application-environment resolution reject every unrecognized `APP_ENV` value instead of silently selecting development configuration, credentials or security policy.

Source: `BE-018` in Series `0001`.

## Context

`parseAppEnv()` currently normalizes a missing value to `Environment.Development` and, more importantly, returns `Environment.Development` for any string not present in the enum. That means typos such as `prodution`, unexpected deployment values or corrupted configuration can silently run development-specific env-file/policy branches. `0130` establishes the canonical config schema and `0131` makes validation failures bootstrap-safe; this task makes invalid environment identity an explicit failure.

## Relevant files and modules

- `MercurionWebNode/src/utils/env-helpers.ts`
- canonical environment/config schema from `0130`
- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/main.ts`
- Docker/Kubernetes/deployment files setting `APP_ENV`
- environment/config tests

## In scope

- Reject any provided `APP_ENV` string outside the canonical environment enum.
- Route the failure through the typed configuration error/bootstrap path from `0131`.
- Ensure env-file selection, security/redaction logic and environment-specific configuration consume only a validated `Environment` value.
- Remove local `process.env.APP_ENV ?? 'development'` checks that can independently recreate fail-open semantics; use canonical validated config instead.
- Add table-driven tests for every supported value, unknown values, case/whitespace mistakes and empty/missing input according to the explicitly declared schema default policy.
- Verify deployment manifests/Dockerfiles use supported canonical values.

## Out of scope

- Do not introduce additional environment names without a human-approved deployment need.
- Do not silently normalize misspellings, case variants or whitespace to a valid environment.
- Do not alter an explicitly declared safe missing-value default from the canonical schema unless the schema/policy says missing `APP_ENV` is invalid; this task specifically forbids *unrecognized provided values* from falling back to development.
- Do not change secrets or deployment topology.

## Decisions already made

- Unknown environment values always fail closed.
- There is no fallback from an unrecognized value to development.
- Environment-dependent code receives the validated enum/config value, not raw `process.env.APP_ENV`.
- Any allowed default for a genuinely absent variable must be explicit in the canonical schema and covered by tests; it is not an error-recovery fallback.

## Requirements

1. Change environment parsing/resolution to return a valid `Environment` or typed validation failure; never coerce unknown input to development.
2. Replace direct raw `APP_ENV` comparisons in production logic with canonical validated configuration where practical.
3. Verify `shouldUseEnvFile` and all redaction/security/environment branches receive only validated values.
4. Add negative tests for `prodution`, `DEV`, whitespace variants, arbitrary strings and unsupported future names.
5. Add positive tests for `development`, `test`, `staging` and `production`.
6. Test the canonical missing/empty-value policy separately from unknown-value handling.
7. Verify current Dockerfiles/Kubernetes manifests declare supported values and fail validation if changed to an unsupported one in a test fixture.

## Acceptance criteria

- [ ] An unknown `APP_ENV` aborts bootstrap with a typed configuration error.
- [ ] No unknown value can select development env files, credentials, redaction or security behaviour.
- [ ] Production code does not independently default raw `APP_ENV` to development after schema validation.
- [ ] Every supported environment value is table-tested.
- [ ] Common typo/case/whitespace inputs are rejected deterministically.
- [ ] Existing valid deployments remain compatible.

## Validation

Run environment/config/bootstrap tests, negative startup fixtures for unknown `APP_ENV`, Nest build, full tests/E2E and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` only if the canonical schema from `0130` left the behaviour for an entirely missing `APP_ENV` intentionally undecided and executing this task requires resolving that separate default policy. Unknown provided values must still never fall back silently.

## Dependencies

- `0130-define-every-nest-configuration-property-once.md` must be `DONE`.
- `0131-make-environment-validation-bootstrap-safe-and-testable.md` must be `DONE`.

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
