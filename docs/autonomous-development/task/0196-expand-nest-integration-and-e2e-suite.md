# 0196 - Expand the Nest integration and E2E suite

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Replace the current Hello-World-only Nest E2E coverage with a deterministic real-application suite that exercises authentication, REST, GraphQL, canonical error mapping and session behavior while owning and closing every runtime resource it starts.

Source: `QA-010` in Series `0001`.

## Context

`MercurionWebNode/test/app.e2e-spec.ts` currently boots the application and tests only `GET /` returning `Hello World!`. That does not protect the actual public application surface. Earlier tasks make config import-safe, define GraphQL/REST contracts, decompose auth/session and create real database/Redis integration infrastructure. This task turns Nest E2E into a meaningful public-boundary test suite without conflating it with Angular browser/system testing.

## Relevant files and modules

- `MercurionWebNode/test/app.e2e-spec.ts`
- `MercurionWebNode/test/jest-e2e.json`
- Nest application/module bootstrap
- REST controllers and GraphQL module
- auth/session guards and error presenters
- PostgreSQL/Redis test fixtures
- external-provider test adapters

## In scope

- Build a reusable Nest E2E application fixture with explicit test config and deterministic teardown.
- Exercise representative authenticated and anonymous REST endpoints.
- Exercise representative GraphQL query/mutation through the actual HTTP GraphQL endpoint.
- Exercise authentication/session creation/validation/revocation behavior at public server boundaries.
- Verify canonical REST/GraphQL error mapping for validation, authentication, not-found/forbidden and representative infrastructure failure.
- Use `app.getHttpServer()` or an OS-assigned/random test port so suites do not collide.
- Replace live external integrations with explicit test adapters while using real PostgreSQL/Redis where their semantics are part of the E2E behavior.

## Out of scope

- Do not use a fixed public port that conflicts with local development.
- Do not contact live OAuth/Dropbox/Meilisearch/Tox21 providers unless a separately controlled integration test explicitly owns that dependency.
- Do not rely on `--forceExit` for cleanup.
- Do not treat the root Hello World smoke test as sufficient coverage; keep it only if `/` remains an intentional public contract.

## Decisions already made

- E2E tests exercise the real Nest transport/application boundary.
- External vendors are replaced with deterministic adapters; core persistence/session infrastructure uses real test services where needed.
- Test fixtures own every resource they start and close it explicitly.
- Ports are process-isolated/random or use the in-memory HTTP server.

## Requirements

1. Refactor E2E setup into a reusable application fixture using the import-safe test configuration from `0188`.
2. Seed deterministic owner/non-owner/authenticated test data through supported application/test fixture boundaries.
3. Add REST coverage for representative public and authenticated controller paths.
4. Add GraphQL HTTP coverage that complements, rather than duplicates, the resolver matrix from `0193`.
5. Add session/auth boundary tests for valid, invalid/expired and logout/revocation scenarios.
6. Assert canonical transport status/error payloads/codes rather than internal exception message text.
7. Use real test PostgreSQL/Redis for relevant state and deterministic cleanup between suites.
8. Prove the suite exits naturally with all Nest/external-client resources closed.

## Acceptance criteria

- [ ] Nest E2E covers real auth, REST, GraphQL, error mapping and session behavior.
- [ ] The suite does not depend on a fixed conflicting port or live third-party provider.
- [ ] Real test persistence/session resources are isolated and cleaned deterministically.
- [ ] The suite exits naturally with no `--forceExit` or leaked handle.
- [ ] Hello World, if retained, is only an ordinary smoke case rather than the E2E suite's substance.

## Validation

Run `test:e2e` repeatedly with open-handle detection where compatible, run PostgreSQL/Redis fixtures from clean state, then Nest unit/integration tests, lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not applicable; this is server E2E. Browser/system coverage belongs to `0195` and `0197`.

## Stop conditions

Mark `BLOCKED` if an external dependency cannot be isolated behind an existing/test adapter and the E2E path cannot run deterministically without real credentials, or if a public transport contract remains unresolved.

## Dependencies

- `0188` import-safe Jest/test bootstrap must be `DONE`.
- `0193` GraphQL contract harness and `0194` real PostgreSQL infrastructure should be available where relevant.
- Auth/session/data refactors must be `DONE` for the paths under test.

## Implementation notes

Prefer one well-owned E2E fixture over ad-hoc `Test.createTestingModule` setup copied across files. Keep service/container lifetimes explicit so later CI parallelization remains safe.

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

- Direct terminal prerequisite(s): `0188` (QA-002, SKIPPED_DEPENDENCY), `0193` (QA-007, SKIPPED_DEPENDENCY), `0194` (QA-008, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0188 QA-002 SKIPPED_DEPENDENCY -> 0196 QA-010 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
