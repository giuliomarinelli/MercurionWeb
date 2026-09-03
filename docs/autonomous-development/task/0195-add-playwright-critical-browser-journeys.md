# 0195 - Add Playwright critical browser journeys

- [ ] DONE
- [ ] BLOCKED
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
- Angular routes/auth/action/collection/Notebook UI
- canonical runtime in `docs/autonomous-development/RUNTIME.md`
- nginx development edge at `http://localhost:8888`
- CI pipeline from `0008`/`0202`

## In scope

- Add Playwright as the canonical browser E2E runner and provide root/project scripts for local and CI execution.
- Use `http://localhost:8888` as the application base URL; never validate critical flows through a direct Angular dev-server origin.
- Provide deterministic API/GraphQL/auth fixtures through Playwright route interception or a dedicated test backend mode where appropriate.
- Cover representative anonymous navigation/login shell, authentication/MFA/session behavior, molecule/collection workflow and Notebook workflow when the features are reachable.
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
4. Cover at minimum one anonymous route/login flow, one login→MFA/session lifecycle scenario, one molecule/collection interaction and the Notebook create/edit/reorder journey if Notebook is reachable after `0020`.
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
- Relevant FE/UI/NG tasks and `0020` Notebook reachability must be `DONE` before their journeys are enabled.
- `0019` records Playwright as the preferred browser E2E direction.

## Implementation notes

Keep mocked/controlled network semantics explicit in test names/fixtures. A browser test with mocked GraphQL proves Angular/browser behavior; it does not claim to prove the real GraphQL contract, which is why `0197` exists separately.

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
_Not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
