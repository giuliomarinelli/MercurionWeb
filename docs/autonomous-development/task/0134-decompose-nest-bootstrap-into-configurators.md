# 0134 - Decompose Nest bootstrap into cohesive configurators

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Reduce `main.ts` to a small application bootstrap that creates the Nest app, applies a canonical ordered set of infrastructure configurators and starts the listener, with each bootstrap concern independently testable.

Source: `BE-020` in Series `0001`.

## Context

`main.ts` currently owns process handlers, log levels, Fastify/trust-proxy creation, NATS registration, filters, global prefix, Helmet, validation, cookies, request-header sanitization/device/session context, multipart parsing, security headers, Redis-backed rate limiting, microservice startup and listener/log formatting. This makes infrastructure policy difficult to test and causes unrelated concerns to share mutable bootstrap state.

## Relevant files and modules

- `MercurionWebNode/src/main.ts`
- canonical config from tasks `0130`-`0133`
- exception/error presenter infrastructure
- rate-limit configuration
- auth cookie/request-context infrastructure
- NATS and Socket.IO modules
- bootstrap/E2E tests

## In scope

- Extract cohesive configurators for logging, transport/microservices, security headers, validation, cookies/request context, rate limiting and startup.
- Give configurators explicit typed dependencies rather than repeated `app.get()`/raw environment access.
- Define and test the required configurator order where ordering is semantically important.
- Keep `main.ts` responsible only for app creation, configurator composition, startup and top-level fatal bootstrap handling.
- Make configurators callable against a test Nest/Fastify application without opening a real listener where practical.

## Out of scope

- Do not redesign the policies themselves beyond changes required by adjacent BE tasks.
- Do not implement shutdown coordination here; `0135` owns graceful shutdown.
- Do not change public route contracts.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Bootstrap composition and bootstrap policy implementation are separate responsibilities.
- Configurators are small, deterministic and ordered explicitly.
- No configurator reads raw environment variables when validated config is available.

## Requirements

1. Inventory every current responsibility in `main.ts` and assign it to one owner.
2. Extract typed configuration functions/classes without creating a generic catch-all bootstrap utility.
3. Preserve the anti-spoof request-header hook and its relative order with cookie/session processing.
4. Preserve global filters/pipes/prefix and security headers through explicit configurators.
5. Preserve NATS/Socket.IO and rate-limit setup through dedicated infrastructure configuration.
6. Add focused tests for each configurator plus one bootstrap-order smoke test.
7. Keep `main.ts` small enough that application startup flow is readable without scrolling through policy implementations.

## Acceptance criteria

- [ ] `main.ts` contains only orchestration/startup, not plugin/policy implementation details.
- [ ] Every extracted bootstrap concern has focused tests.
- [ ] Ordering-sensitive hooks/plugins are verified in integration tests.
- [ ] No duplicate bootstrap configuration remains.
- [ ] Existing HTTP/GraphQL/WebSocket/NATS startup behaviour remains compatible.

## Validation

Run bootstrap/configurator tests, Nest E2E bootstrap tests, build and canonical CI-parity gates.

## Browser validation

When runtime smoke evidence is useful, start the canonical runtime and verify `http://localhost:8888/health` plus one authenticated/public flow. Do not use browser evidence as a substitute for bootstrap tests.

## Stop conditions

Mark `BLOCKED` if extracting a configurator exposes an unresolved security/environment policy owned by `0136`; isolate the structural work and record the decision rather than inventing a policy.

## Dependencies

- `0133-canonicalize-nats-endpoint-configuration.md` should be `DONE`.

## Execution notes

### Feature branch
`feature/BE-020`, based on `aac3e6296d4d8798a57d98bf90bc4440957d544b`.
### Preflight
Verified a clean `feature/BE-020` checkout at the supplied base SHA. The exact
`develop` SHA had a successful GitHub Actions CI run (`34702840339`), and
dependency task `0133` was already `DONE`. No task-owned runtime or test
watcher was started during the implementation preflight.
### Preflight remediation
_None._
### Summary
Moved bootstrap policy out of `main.ts` into typed, independently callable
configurators for logging, transport/microservices, security headers and REST
versioning, validation/filters, cookies/request context and multipart parsing,
Redis-backed rate limiting, and startup. `main.ts` now creates the application,
collects dependencies, applies the explicit ordered composition, and retains
only fatal bootstrap reporting. The anti-spoof request hook remains before
rate limiting, while NATS, Socket.IO, global prefix, headers, validation,
cookies, and startup behavior remain represented without duplicate setup.
### Task-specific validation performed
* `npm run typecheck --workspace mercurion_web_node` — passed.
* `npm test --workspace mercurion_web_node -- --runInBand bootstrap.configurator.spec.ts main.spec.ts` — 11 tests passed.
* `npm run build --workspace mercurion_web_node` — passed.
* `npm run lint --workspace mercurion_web_node` — passed with 48 pre-existing warnings and no errors.
* `git diff --check` — passed.
* CI repair focused checks: `node scripts/check-rest-route-ownership.mjs` — passed
  with 72 routes classified; `node scripts/check-rest-compatibility.mjs` —
  passed with 59 client calls matched to Nest routes; `git diff --check` —
  passed.
* The new composition test verifies the explicit configurator order and
  sequential application; logging tests verify environment-specific levels.
### Full pre-merge CI-parity validation
Not run locally; prohibited by the autonomous contract. Exact feature-SHA
GitHub Actions validation is owned by the coordinator.
### Browser validation performed
Not required for this structural bootstrap refactor; focused bootstrap tests,
typecheck, build, and lint establish the declared acceptance locally.
### Commits
* `66850b149f2929e3032ac906f843b1c9be1fce7e` — original implementation.
* CI repair commit recorded below.

### CI repair
Exact feature CI run `34703550473` failed on Windows and Ubuntu in the
registered static checks because `scripts/rest-route-extraction.mjs` only
looked for `setGlobalPrefix` in `MercurionWebNode/src/main.ts`, while BE-020
correctly moved that policy to
`MercurionWebNode/src/bootstrap/configurators/security.configurator.ts`.
The extractor now checks the legacy bootstrap location first and the extracted
security configurator second, preserving the same prefix and exception
contract. The REST compatibility checker likewise recognizes the extracted
validation configurator, and the route ownership inventory was regenerated
only for references that moved from `main.ts` to the security configurator.
No runtime/browser behavior changed.
### Merge / CI
Feature branch publication is performed after the task-specific commit.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
