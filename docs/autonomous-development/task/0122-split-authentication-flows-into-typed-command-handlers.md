# 0122 - Split authentication flows into typed command handlers

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Separate credential login, MFA handoff, SSO completion, token refresh, logout and session-management flows into typed authentication command handlers/use cases so controllers do not orchestrate multi-step domain logic.

Source: `BE-008` in Series `0001`.

## Context

`AuthenticationService` and `AuthenticationController` currently coordinate password validation, User/Session/MFA/JWT services, cookies, response shaping and multiple auth paths in the same service/controller surface. Earlier tasks establish identity/token boundaries and focused account use cases; `0123` will further split MFA internals. This task defines the application-flow ownership used by REST and SSO/auth entrypoints without changing the security semantics of those flows.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/authentication.service.ts`
- `MercurionWebNode/src/app_modules/auth/controllers/authentication.controller.ts`
- auth DTOs/responses and token/session contracts
- SSO entrypoints that complete or hand off authentication
- `JwtToolsService`, session and MFA public ports
- authentication/controller specs

## In scope

- Map each public authentication route/entrypoint to one explicit command/query use case.
- Create typed handlers for credential login/start, MFA continuation/handoff, refresh, logout, session lookup/revocation and SSO completion where currently owned by AuthenticationService.
- Keep cookie/header/Fastify manipulation in transport adapters or dedicated transport helpers, not use cases.
- Return typed application outcomes that transport presenters map to HTTP responses/cookies.
- Make failure classes/outcomes explicit without changing their user-visible classification; typed error migration is completed by `0127`/`0128`.
- Remove orchestration from `AuthenticationController` and retire the broad `AuthenticationService` once migrated.

## Out of scope

- Do not redesign MFA challenge internals; `0123` owns that split.
- Do not change JWT/session lifetime/security policy.
- Do not redesign OAuth provider clients or HTTP adapter policy (`BE-030`).
- Do not alter external route paths or response contracts except where an earlier SYS task already established a canonical contract.

## Decisions already made

- Each authentication flow has one application handler with typed input/output.
- Controllers/resolvers translate transport data, invoke one handler and present its result.
- Cookie/header mutation is a transport concern.
- Auth handlers depend on identity/token/session/MFA ports rather than concrete foreign-domain internals.

## Requirements

1. Inventory all AuthenticationService public methods and controller/SSO callers.
2. Define command/result types for each supported auth flow, including explicit next-step states where MFA/SSO continues.
3. Move orchestration to focused handlers and keep shared policies behind reusable auth-domain services.
4. Make refresh/logout/session-revocation idempotency/error behaviour explicit and preserve current policy.
5. Remove direct controller orchestration across Mfa/Jwt/User/Session services.
6. Migrate all callers and remove the broad service when unused.
7. Add table-driven tests for successful and failing transitions for every handler.

## Acceptance criteria

- [ ] Every authentication entrypoint invokes one typed use case/handler.
- [ ] Controllers contain no multi-service authentication orchestration.
- [ ] Credential, MFA handoff, SSO completion, refresh, logout and session management have distinct owners.
- [ ] The monolithic `AuthenticationService` is removed or reduced to a non-orchestrating domain primitive with a single responsibility.
- [ ] Existing auth/session security behaviour and public contracts remain compatible.

## Validation

Run authentication/controller/session/JWT focused tests, auth E2E flows for login/refresh/logout/SSO handoff where fixtures permit, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable as a required gate; the same-origin browser flows are covered later by system/E2E tasks, while this refactor is validated at transport/use-case boundaries.

## Stop conditions

Mark `BLOCKED` if the current flow contains an ambiguous security transition (for example refresh/revocation/MFA handoff) whose intended result cannot be preserved without a human policy decision.

## Dependencies

- `0116-separate-identity-token-and-authorization-services.md` must be `DONE`.
- `0118-give-every-core-nest-provider-a-single-owner.md` must be `DONE`.

## Execution notes

### Feature branch
`feature/BE-008`, created from and descended directly from green `develop`
SHA `377713bbe0e2a675355cd9207c2d9b8d0e4c72e3`.
### Preflight
- Confirmed the clean local branch was exactly `feature/BE-008` at the supplied
  base SHA and that the base is an ancestor of the task branch.
- Confirmed GitHub Actions CI run
  `https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34690355968`
  completed successfully for the exact base SHA.
- Confirmed no Angular, Nest, Tox21, Jest/Vitest watcher, or other
  workspace-consuming process was active.
- Confirmed prerequisite tasks 0116 and 0118 are `DONE`.
- Focused unchanged checks passed before editing:
  - 8 authentication/controller/session/JWT/SSO suites, 15 tests.
  - `npm run typecheck --workspace mercurion_web_node`.
  - `npm run ci:nest:architecture`.
- Local `npm ci` and `npm run ci:check` were not run.
### Preflight remediation
_None._
### Summary
- Replaced the broad `AuthenticationService` with typed handlers for email
  verification, credential login, MFA challenge start/completion, logout,
  single/all-session revocation, websocket-token refresh, active-session
  lookup, local-development login, and SSO authentication completion.
- Added typed discriminated outcomes for transport-visible continuations and
  failures. Controllers now invoke one handler per authentication entrypoint
  and retain only HTTP response, cookie, header/decorator, and presentation
  responsibilities.
- Added the single-purpose `AuthenticationSessionService` for shared
  fingerprinting, MFA pre-authorization binding, authenticated-session trust
  updates, and access-token issuance.
- Preserved existing credential lockout, password migration, adaptive MFA,
  development test-account bypass, MFA device binding, token/session
  revocation, cookie lifetime, logout idempotency, SSO error classification,
  route paths, DTOs, and REST compatibility inventory.
- Moved `/account/active-sessions` behind `ListActiveSessionsHandler` and
  removed all remaining `AuthenticationService` references and files.
### Task-specific validation performed
- Focused authentication validation passed: 13 suites / 45 tests covering all
  new handlers, controller presenters, session/JWT services, SSO boundaries,
  and Auth module wiring.
- Table-driven handler tests cover successful and failing credential, MFA,
  logout, revocation, refresh, session-query, local-development, and SSO
  transitions.
- `npm run contracts:check --workspace mercurion_web_node` passed: 8 suites /
  38 tests.
- `npm run ci:rest-compatibility` passed with 59/59 client calls matched to 58
  Nest routes; the committed REST inventory remained unchanged.
- `npm run ci:nest:architecture` passed for 22 production modules, 8
  configuration files, and all governed provider ownership checks.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run lint --workspace mercurion_web_node` passed with 49 pre-existing
  warnings and no errors.
- `npm run build --workspace mercurion_web_node` passed.
- Full Nest unit suite passed: 137 suites / 288 tests.
- Full Nest E2E suite passed: 1 suite / 1 test.
- `git diff --check` passed; static inventory confirmed zero
  `AuthenticationService` references and no direct authentication-domain
  service imports in `AuthenticationController`.
### Full pre-merge CI-parity validation
Complete clean-install and aggregate CI parity are reserved for GitHub Actions
on the exact pushed feature SHA. No forbidden local `npm ci` or
`npm run ci:check` command was executed.
### Browser validation performed
_Not applicable._
### Commits
- `3ed3fcd49ef3a63deb52f72260f6ad717783a7b0` — BE-008 typed authentication
  handlers and focused tests, committed with `--no-gpg-sign` and the Copilot
  co-author trailer.
- Task-status and execution-note finalization: current documentation commit.
### Merge / CI
Provisional `DONE` / `CI_PENDING`; exact feature-SHA CI and integration are
coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
