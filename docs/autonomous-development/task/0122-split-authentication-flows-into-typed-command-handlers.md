# 0122 - Split authentication flows into typed command handlers

- [ ] DONE
- [ ] BLOCKED

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
