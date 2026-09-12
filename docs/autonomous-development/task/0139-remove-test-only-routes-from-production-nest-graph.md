# 0139 - Remove test-only routes from the production Nest graph

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-025`, based on `a69b51c7fbde3781c054251bd0ecb106be1c03c5`.
### Preflight
Verified clean `feature/BE-025` identity at the supplied base SHA. `develop`,
`origin/develop`, and the feature branch all matched
`a69b51c7fbde3781c054251bd0ecb106be1c03c5`; no remote feature ref existed.
Dependency task `0134` (`BE-020`) is `DONE`. Exact base GitHub Actions CI run
`34709082960` completed successfully. No task-owned Angular, Nest, Tox21, or
test watcher process was active. Local Nest typecheck and `git diff --check`
passed.
### Preflight remediation
None.
### Summary
Removed `TestController` from `AppModule` so production bootstrap cannot expose
`/api/test`. Added explicit `TestApplicationModule` composition and factory
under `src/test-utils` for tests that intentionally need the route. Added
production/test graph assertions in unit and E2E suites, and registered a
static architecture policy that rejects test-only controller imports from
production Nest modules. The existing `/health` controller and route remain
unchanged.
### Task-specific validation performed
* `npm run typecheck --workspace mercurion_web_node` — passed.
* `npm test --workspace mercurion_web_node -- --runInBand src/app.module.spec.ts src/test.controller.spec.ts` — 2 suites, 9 tests passed.
* `npm run test:e2e --workspace mercurion_web_node -- --runInBand` — 1 suite, 3 tests passed, including production graph exclusion and explicit test graph registration assertions.
* `npm run ci:nest:architecture` — passed: production module/configuration graphs acyclic, provider ownership checks passed, and test-only route policy passed.
* `node scripts/check-nest-test-route-policy.mjs` — passed.
* `npm run lint --workspace mercurion_web_node` — passed with 48 pre-existing warnings and no errors.
* `npm run build --workspace mercurion_web_node` — passed.
* `git diff --check` — passed.
### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are prohibited by the
autonomous contract. Exact feature-SHA GitHub Actions validation is owned by
the coordinator.
### Browser validation performed
Not applicable; this is a Nest graph/static architecture task.
### Commits
_Pending commit._
### Merge / CI
Feature publication follows the task-specific commit. No merge or branch
deletion performed.
### Rollback
_Not applicable._
### Blocker / human decision required
None. No deployment dependence on `/api/test` was found or proven.
