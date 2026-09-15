# 0195 - Add Playwright critical browser journeys

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Introduce Playwright browser E2E tests for Mercurion's critical Angular journeys using accessible locators, deterministic API/test fixtures and the canonical `http://localhost:8888` browser edge, with zero arbitrary sleeps.

Source: `QA-009` in Series `0001`.

## Context

The repository has Angular unit tests but no working browser E2E runner. The future-work guidance recorded in task `0019` explicitly prefers Playwright. The canonical Development Session runtime exposes the application only through the nginx same-origin edge at `http://localhost:8888`; tests must therefore validate the same routing/cookie/CORS topology used during real local operation rather than bypassing it with the Angular dev-server origin. This task is frontend browser E2E and may use deterministic API routing/fixtures; the real frontend+backend contract is separately proven by `0197` system tests.

## Relevant files and modules

- `MercurionWebNg/package.json`
- new Playwright configuration/test project
- Angular routes/auth/action/collection UI in the active program
- canonical runtime in `docs/autonomous-development/RUNTIME.md`
- nginx development edge at `http://localhost:8888`
- CI pipeline from `0008`/`0202`

## In scope

- Add Playwright as the canonical browser E2E runner and provide root/project scripts for local and CI execution.
- Use `http://localhost:8888` as the application base URL; never validate critical flows through a direct Angular dev-server origin.
- Provide deterministic API/GraphQL/auth fixtures through Playwright route interception or a dedicated test backend mode where appropriate.
- Cover representative anonymous navigation/login shell, authentication/MFA/session behavior and molecule/collection workflow.
- Use role/label/text locators primarily; use stable `data-testid` only when no semantic locator exists.
- Capture useful trace/screenshot diagnostics on failure without making them the assertion strategy.
- Make readiness explicit and use web-first assertions instead of arbitrary timeout sleeps.

## Out of scope

- Do not use Cypress or maintain two browser E2E frameworks.
- Do not require real third-party OAuth/Dropbox/Meilisearch services for frontend browser tests.
- Do not use API mocks in `0197`, whose purpose is real same-version system integration.
- Do not add `waitForTimeout`/fixed sleeps to hide readiness or race defects.

## Decisions already made

- Playwright is the selected browser E2E framework.
- Browser tests enter through `http://localhost:8888` and the externally managed nginx edge.
- Accessible locators are preferred over implementation CSS selectors.
- Frontend E2E may control network dependencies deterministically; system tests later prove the real backend contract.

## Requirements

1. Add pinned Playwright tooling/configuration and scripts compatible with the repository/root workspace architecture.
2. Define base URL `http://localhost:8888` and deterministic readiness checks without starting/stopping externally managed nginx.
3. Build reusable authenticated/anonymous fixture setup that does not store production secrets and can control session/API outcomes.
4. Cover at minimum one anonymous route/login flow, one login→MFA/session lifecycle scenario and one molecule/collection interaction.
5. Verify representative error/loading/empty states rather than only successful navigation.
6. Use role/name/label locators and web-first assertions; justify any test ID introduced.
7. Configure traces/screenshots on failure and retain them as CI artifacts.
8. Ensure every test restores/isolates browser storage/cookies and controlled backend fixtures.

## Acceptance criteria

- [ ] Playwright is the single configured browser E2E framework.
- [ ] Critical tests navigate only through `http://localhost:8888`.
- [ ] The selected critical journeys pass deterministically without arbitrary sleeps.
- [ ] Semantic locators are the default and failure diagnostics are captured.
- [ ] Tests are isolated and do not call uncontrolled external providers.
- [ ] The browser E2E suite is registered in canonical CI parity.

## Validation

Run the Playwright suite repeatedly in headless mode against the canonical runtime, inspect failure-artifact behavior, then run Angular/Nest required gates and repository-wide CI parity.

## Browser validation

This task is itself browser validation. Use only the canonical edge `http://localhost:8888` and Chrome/Playwright isolation appropriate to the test suite.

## Stop conditions

Mark `BLOCKED` if a critical journey's expected behavior remains unresolved by its implementation task, or if the canonical nginx runtime cannot be made deterministically testable without changing externally managed infrastructure policy.

## Dependencies

- `0187` must provide a green Angular unit-test runner.
- Relevant active-program FE/UI/NG tasks must be `DONE` before their journeys are enabled.
- `0019` records Playwright as the preferred browser E2E direction.

## Implementation notes

Keep mocked/controlled network semantics explicit in test names/fixtures. A browser test with mocked GraphQL proves Angular/browser behavior; it does not claim to prove the real GraphQL contract, which is why `0197` exists separately.

## Execution notes

### Feature branch
`feature/QA-009`, based on `043a333feb20b0850353b571b31122e46dee7b31`.
The branch was clean and exactly matched the supplied/current green
`develop` SHA before implementation; no remote feature ref existed.
### Preflight
Exact base SHA `043a333feb20b0850353b571b31122e46dee7b31` had successful
GitHub Actions CI run `34985586114` on `develop`. No task-owned workspace
process was active before the probe. Local `npm ci` and `npm run ci:check`
were not run.

The first canonical runtime probe started Tox21, Nest and Angular in the
required order with live execution handles. Angular became ready through the
edge (`/` returned 200), while Nest initially failed during bootstrap with:
`fastify-plugin: fastify-formidable - expected '4.x' fastify version,
'5.12.1' is installed`.
### Preflight remediation
Human-authorized remediation confirmed the installed mismatch:
`fastify-formidable@3.0.2` advertises Fastify `^4.0.0` while the intentional
repository dependency is `fastify@5.12.1`. Added the narrow
`fastify-formidable.compat.ts` wrapper and the direct `fastify-plugin@5.1.0`
helper dependency. The wrapper declares Fastify 5 compatibility and translates
the legacy `multipart` parser alias to a Fastify-5-valid
`multipart/form-data` matcher only while registering the existing plugin.
Nest typecheck passed and the wrapper removed the original version-mismatch
diagnostic.
### Summary
Added pinned Playwright 1.55.0 tooling/configuration, canonical
`http://localhost:8888` base URL, failure traces/screenshots/video settings,
isolated route-interception fixtures, anonymous/login-to-MFA/session and
molecule/collection journey tests, plus the Fastify 5 compatibility wrapper.
The implementation could not safely reach browser validation because the
post-remediation canonical Nest bootstrap exposed a pre-existing GraphQL
schema failure: `"MercurionPublicId" defined in resolvers, but not in schema`.
The nginx edge consequently remained `health=502` (while Angular `/` returned
200). Per the authorized instruction, the branch is preserved as BLOCKED
rather than repairing unrelated baseline/schema debt.
### Task-specific validation performed
Passed:
- `npx playwright test --list` (3 critical tests discovered);
- `npm run typecheck --workspace mercurion_web_node`;
- `git diff --check`.

Not run: Playwright browser execution, because the mandatory two consecutive
complete canonical readiness rounds could not be obtained after the narrow
preflight remediation.
### Full pre-merge CI-parity validation
Not run locally by policy. `npm ci` and `npm run ci:check` remain reserved for
GitHub Actions.
### Browser validation performed
Not performed. Chrome/Playwright opening was correctly withheld because Nest
did not complete canonical bootstrap and `/health` remained 502. Tox21, Nest
and Angular sessions were stopped; no listeners remained on ports 3498, 8099
or 4222.
### Commits
_Pending blocker diagnostic commit._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
Resolve the repository-controlled GraphQL baseline failure
`"MercurionPublicId" defined in resolvers, but not in schema`, then authorize a
new QA-009 attempt/recovery. Do not charge that unrelated schema repair to
QA-009.
