# 0139 - Remove test-only routes from the production Nest graph

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Ensure test-only controllers/providers are absent from the production `AppModule` graph and can be enabled only through an explicit test application module/context.

Source: `BE-025` in Series `0001`.

## Context

`AppModule` currently registers `TestController` directly, exposing the `/api/test` route in the same graph used by production. Test helpers must not be activated through runtime environment conditionals inside production modules; the production dependency graph itself should not contain them.

## Relevant files and modules

- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/test.controller.ts`
- Nest test/E2E application bootstrap
- production application-graph tests

## In scope

- Remove `TestController` and any equivalent test-only provider from `AppModule`.
- Create a dedicated test application module/overlay only if the route is still useful to automated tests.
- Make test bootstrap explicitly opt into test-only routes/providers.
- Add graph/route assertions proving production does not register test endpoints.
- Keep `/health` as the runtime health contract rather than using a test endpoint as a production probe.

## Out of scope

- Do not hide test routes with an `APP_ENV` runtime `if` inside the production module.
- Do not remove legitimate health/readiness endpoints.
- Do not introduce a production debug route under a different name.

## Decisions already made

- Production and test application graphs are explicit and structurally different where test fixtures are required.
- Test-only routes are opt-in from test bootstrap, never opt-out from production bootstrap.

## Requirements

1. Remove test-only imports/controllers/providers from the production module graph.
2. If retained, define a `TestApplicationModule` or equivalent testing composition that imports the production app plus narrowly scoped fixtures.
3. Update tests/scripts that relied on `/api/test` to use the explicit test graph or `/health` as appropriate.
4. Add an E2E assertion that `/api/test` is 404/not registered in a production-graph application context.
5. Add a static architecture check preventing production modules from importing the test-only area.

## Acceptance criteria

- [ ] `TestController` is unreachable from the production application graph.
- [ ] Production bootstrap exposes no test/debug route by accident.
- [ ] Test-only functionality, if retained, works only from explicit test composition.
- [ ] `/health` remains the supported runtime smoke/readiness entrypoint.
- [ ] CI prevents test-only graph leakage.

## Validation

Run production-graph and test-graph E2E tests, architecture checks, full Nest tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` only if an external deployment process is proven to depend on `/api/test`; require a human decision before preserving a test route in production.

## Dependencies

- `0134-decompose-nest-bootstrap-into-configurators.md` should be `DONE` so test bootstrap can reuse canonical configuration without duplicating it.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0134` (BE-020, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY -> 0133 BE-019 SKIPPED_DEPENDENCY -> 0134 BE-020 SKIPPED_DEPENDENCY -> 0139 BE-025 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
