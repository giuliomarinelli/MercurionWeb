# 0197 - Add same-version frontend/backend system tests

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Add deterministic system tests that run compatible Angular and Nest artifacts from the same repository revision through the canonical nginx same-origin edge and prove at least one anonymous and one authenticated real frontend→API/GraphQL journey without contract mocks.

Source: `QA-011` in Series `0001`.

## Context

Angular browser E2E in `0195` is allowed to control API responses so it can isolate frontend/browser behavior, while Nest E2E in `0196` validates the server boundary without a real browser. Neither proves that the built frontend and backend from the same commit actually interoperate through the deployment-like same-origin topology. The canonical Development Session runtime exposes that topology at `http://localhost:8888` via externally managed nginx. This task adds the missing system-level compatibility proof.

## Relevant files and modules

- Angular production/testable build artifact
- Nest build/runtime
- canonical `docs/autonomous-development/RUNTIME.md`
- Docker/nginx development reverse proxy configuration
- Playwright system-test project/fixtures
- PostgreSQL/Redis/NATS test services as required
- `../MercurionTox21` only when a selected journey truly depends on it, read-only
- CI orchestration from `0202`

## In scope

- Build/run Angular and Nest from the exact same commit/revision under test.
- Exercise the system only through `http://localhost:8888`, including the real Nest REST/GraphQL contract; no API/GraphQL route mocking in this system suite.
- Cover at least one anonymous user journey and one authenticated journey.
- Seed deterministic test data/accounts and clean them after the suite.
- Verify cookie/session/CORS/same-origin routing behavior that unit/isolated E2E tests cannot prove.
- Select journeys that minimize unnecessary external dependencies while still crossing real frontend/backend boundaries.
- Capture browser/server diagnostics needed to identify compatibility failures.

## Out of scope

- Do not use the direct Angular dev-server origin as the system-test URL.
- Do not intercept/mimic the Nest API/GraphQL contract in this suite.
- Do not require unrelated external SaaS providers for the minimum system proof.
- Do not modify the sibling `MercurionTox21` repository; it remains read-only.
- Do not stop/reconfigure externally managed nginx as part of test cleanup.

## Decisions already made

- System tests prove same-version frontend/backend compatibility; API mocks are forbidden here.
- The canonical browser edge is `http://localhost:8888`.
- Anonymous and authenticated paths are both required.
- The suite owns only processes/services it starts; nginx remains externally managed.

## Requirements

1. Define a distinct Playwright/system project or command that cannot accidentally reuse mocked-network fixtures from `0195`.
2. Start/prepare the Nest and Angular artifacts from the exact tested revision and wait on canonical readiness probes.
3. Provision deterministic database/Redis session fixture data and one authenticated test account through safe test setup.
4. Exercise one anonymous journey through Angular to a real server-backed or server-compatible path.
5. Exercise one authenticated journey that crosses Angular→Nest and at least one real REST or GraphQL request and verifies persisted/session state.
6. Assert requests travel through the nginx same-origin edge and expected cookie/auth semantics hold.
7. On failure, retain Playwright trace plus relevant Nest/runtime logs while redacting secrets/tokens.
8. Register the system suite after prerequisite builds/integration tests in CI so incompatible artifacts cannot be released.

## Acceptance criteria

- [ ] Angular and Nest artifacts under test come from the same commit.
- [ ] At least one anonymous and one authenticated real system journey pass through `http://localhost:8888`.
- [ ] No API/GraphQL contract mock is used in the system suite.
- [ ] Auth/session/same-origin behavior is exercised through the real reverse-proxy topology.
- [ ] Test data and owned processes/resources are cleaned deterministically.
- [ ] System tests are part of canonical CI with usable failure diagnostics.

## Validation

Build both applications, start the canonical runtime/test services, run the system suite repeatedly from a clean fixture state, verify no mocked API routes are registered, then execute repository-wide CI parity.

## Browser validation

This task is browser/system validation. Use only `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if the canonical nginx topology cannot be reproduced by CI without an infrastructure decision, or if the only available authenticated journey requires uncontrolled external credentials/services and no internal critical journey can prove compatibility.

## Dependencies

- `0195` Playwright infrastructure and `0196` meaningful Nest E2E should be `DONE`.
- Relevant data/auth integration infrastructure from `0194`/DATA tasks should be available.
- Canonical runtime documentation/process ownership remains authoritative.

## Implementation notes

Keep this suite intentionally smaller than the mocked browser E2E matrix. Its value is crossing the real deployment boundaries with compatible artifacts, not duplicating every frontend scenario.

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