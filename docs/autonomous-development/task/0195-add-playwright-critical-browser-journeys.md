# 0195 - Add Playwright critical browser journeys

- [x] DONE
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

- [x] Playwright is the single configured browser E2E framework.
- [x] Critical tests navigate only through `http://localhost:8888`.
- [x] The selected critical journeys pass deterministically without arbitrary sleeps.
- [x] Semantic locators are the default and failure diagnostics are captured.
- [x] Tests are isolated and do not call uncontrolled external providers.
- [x] The browser E2E suite is registered in canonical CI parity.

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
`feature/QA-009` from base `043a333feb20b0850353b571b31122e46dee7b31`,
preserved at `1d37ba8ee0fb9961a5f29284009582a9b621558b`.
### Preflight
Exact base CI run `34985586114` passed. Tox21, Nest, and Angular were started
in the required order with live handles. Nest initially exposed the
repository-controlled Fastify 4/5 plugin mismatch; the authorized narrow
compatibility remediation resolved that error.
### Preflight remediation
Added a Fastify 5 compatibility wrapper around the existing
`fastify-formidable` plugin and pinned the direct `fastify-plugin` dependency.
No infrastructure or Fastify version downgrade was made.
### Summary
Added pinned Playwright 1.55.0 tooling/configuration, canonical
`http://localhost:8888` base URL, failure diagnostics, deterministic route
fixtures, and three critical journeys. The task is blocked because Nest then
failed during bootstrap with `"MercurionPublicId" defined in resolvers, but not
in schema`; the canonical edge remained unavailable for the required readiness
rounds, so browser validation could not safely begin.
### Task-specific validation performed
Passed Playwright test discovery (three tests), Nest typecheck, Nest lint, and
`git diff --check`.
### Full pre-merge CI-parity validation
Not run locally; forbidden by policy. Feature CI run `34988102571` passed with
the Required gate.
### Browser validation performed
Not performed because the Nest bootstrap/schema baseline failure prevented
nginx readiness and browser execution.
### Commits
Feature implementation and blocker diagnostic:
`1d37ba8ee0fb9961a5f29284009582a9b621558b`.
### Merge / CI
Implementation was not merged. Feature CI run `34988102571` passed.
### Rollback
_Not applicable._
### Historical blocker (resolved)
The repository-controlled GraphQL schema baseline failure required an
authorized QA-009 recovery attempt. The recovery below resolves it.

### Authorized recovery 2026-09-15
Recovery resumed from preserved SHA
`1d37ba8ee0fb9961a5f29284009582a9b621558b` after merging current green
`develop` with `--no-ff --no-gpg-sign`. Removed the obsolete
`MercurionPublicId` resolver registration that no longer had a matching schema
scalar, restoring Nest bootstrap without changing the identifier utility.

The three critical Chromium journeys now run serially with deterministic JWT,
cookie, REST, GraphQL, MFA and WebSocket fixtures. They cover anonymous login
validation, login-to-MFA session activation, and the collections empty/create
flow through `http://localhost:8888`. Repeated headless runs passed with no
fixed sleeps; retained traces, screenshots and videos were inspected while
repairing failures. The canonical full CI path now installs Chromium, starts a
disposable nginx edge in front of Angular, runs the suite and uploads failure
artifacts. The stable `Required gate` requires this browser job.

Focused validation passed: autonomous control-plane validation, Nest lint,
Nest typecheck, Playwright discovery and repeated Playwright execution (three
tests). Repository-wide clean-install validation remains owned by exact-SHA
GitHub Actions.

Final feature SHA `7ea5e067771bb9ad795d53f05f488ea5cb2a3df3` passed full
CI run `35011032744`, including the critical browser job and stable Required
gate. It was merged into `develop` with merge commit
`84324fa193730886b27b08b875afa00590ee4a4e`; exact merge-SHA full CI run
`35011807978` passed. The local and remote feature branches were then deleted.

The authoritative dependency planner identified stale skips `0197`, `0198`,
`0214`, `0215`, `0217`, `0218` and `0219`. They were reset to pending with
placeholder execution notes; the final plan reports no errors, cycles,
`toSkip`, or `staleSkips`.
