# 0132 - Fail closed on unknown APP_ENV values

- [x] DONE
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
`feature/BE-018`, created from and still based on
`03a991b5f2e8cee5a74950542a86decc52932824`.
### Preflight
Passed:

- clean `feature/BE-018` at the supplied base SHA; the supplied base is an
  ancestor of the feature branch;
- no active Angular, Nest, Tox21 or test-watcher process;
- prerequisites `0130` and `0131` are both `DONE`;
- exact base-SHA GitHub Actions run
  [34699413289](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34699413289)
  completed successfully with `Quality (ubuntu-latest)`,
  `Quality (windows-latest)` and `Required gate` green;
- focused unchanged configuration/bootstrap Jest suites: `4` suites / `25`
  tests;
- unchanged Nest typecheck.
### Preflight remediation
_None._
### Summary
Changed `parseAppEnv()` so only a genuinely missing value receives the
schema-declared `development` default. Every provided unsupported value now
raises `ConfigurationError` with the same structured, value-free diagnostics
as canonical environment validation, allowing `runBootstrap()` to report it
and set a failing process result.

Environment-sensitive production consumers now use
`ConfigService.getOrThrow()` for the validated `App.env` value. This removes
the JWT-key development fallback and prevents missing configuration from
silently selecting development credentials, namespace, logging, GraphQL,
release or redaction behaviour.

Added table-driven coverage for all supported environments, typo/case/
whitespace/arbitrary/empty values, the explicit missing-value policy,
env-file selection, typed bootstrap failure handling, and every current
Docker/Kubernetes `APP_ENV` declaration. Negative Docker and Kubernetes
fixtures prove unsupported deployment values fail validation.
### Task-specific validation performed
Passed:

- focused final APP_ENV/configuration/bootstrap/provider Jest run: `7` suites /
  `53` tests;
- complete Nest Jest suite: `142` suites / `396` tests;
- complete Nest E2E suite: `1` suite / `1` test;
- `npm run typecheck --workspace mercurion_web_node`;
- `npm run lint --workspace mercurion_web_node` (`0` errors; `48` existing
  warnings);
- `npm run build --workspace mercurion_web_node`;
- `npm run ci:nest:architecture`;
- compiled `MercurionWebNode/dist/src/main.js` with
  `APP_ENV=prodution`: emitted `[CONFIGURATION_ERROR]` with
  `code: INVALID_CONFIGURATION`, an `APP_ENV` enum diagnostic and exit code
  `1`;
- `git diff --check`.

An initial complete unit run exposed four stale test doubles after production
consumers moved to `getOrThrow()`. The GraphQL and RDKit fixtures were updated,
their focused suites passed, and the complete unit suite then passed.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run per autonomous
policy. Complete clean-install Windows/Linux validation and the stable
`Required gate` remain coordinator-owned on the exact pushed feature SHA.
### Browser validation performed
_Not applicable._
### Commits
- `a5b84ec9` - `refactor(config): reject unknown app environments`
- Task outcome and execution record: this commit.
### Merge / CI
Feature branch is ready for exact-SHA pre-merge GitHub Actions validation;
merge remains coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
