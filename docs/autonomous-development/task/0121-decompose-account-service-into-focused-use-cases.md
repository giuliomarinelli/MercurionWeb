# 0121 - Decompose AccountService into focused account use cases

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the 1,047-line `AccountService` with focused registration, activation, profile, credential-recovery and sensitive-data-change use cases whose dependencies and public contracts are limited to one responsibility.

Source: `BE-007` in Series `0001`.

## Context

`AccountService` currently injects UserService, password/security/token/config, mail/SMS, Redis, SessionService, ResponseService, security audit, DataSource, ScopeService and logging, while also owning many rate-limit keys/constants and flows. The Series identifies 43 methods and 14 dependencies. Earlier tasks establish directional module/provider/repository boundaries; later DATA tasks centralize attempts/cooldowns, onboarding, transactions and outbox effects. This task must create clean account use-case seams without prematurely implementing those later persistence/effect policies.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/account.service.ts`
- `MercurionWebNode/src/app_modules/auth/controllers/account.controller.ts`
- `MercurionWebNode/src/app_modules/auth/controllers/recovery.controller.ts`
- account/auth DTOs and enums
- notification/session/user/security ports used by account flows
- adjacent account/recovery specs

## In scope

- Inventory every public AccountService method and group it by registration, activation, profile/account settings, credential recovery, password change and sensitive contact/data change.
- Introduce one command/query handler/use-case service per coherent flow or tightly related flow family.
- Make controller methods call one use case rather than orchestrating multiple domain services.
- Extract flow-specific input/output models and keep transport response shaping outside use-case logic.
- Move flow-local constants/helpers with their owning policy/use case while avoiding new duplication.
- Retire the monolithic `AccountService` once all production callers migrate.
- Add focused behavioural tests for each extracted use case.

## Out of scope

- Do not implement the final atomic attempts/rate-limit policy engine owned by `DATA-007`; preserve current thresholds/semantics behind a replaceable port.
- Do not redesign registration/onboarding idempotency or workspace initialization owned by `DATA-005/006`.
- Do not implement outbox delivery for mail/SMS yet.
- Do not alter public account API routes or security policy.

## Decisions already made

- Registration, activation, profile, recovery and sensitive-data changes are separate application responsibilities.
- A use case exposes typed input/output and coordinates only the ports required by that flow.
- Controllers are transport adapters and do not become the new orchestration layer.
- Existing security/rate-limit semantics are preserved until their dedicated DATA task intentionally changes implementation.

## Requirements

1. Produce a call-site/public-method map before extraction so no live flow disappears.
2. Define focused account use cases with explicit dependencies and no kitchen-sink service inheritance.
3. Move validation/business sequencing into use cases; keep HTTP/Fastify details in controllers.
4. Ensure each flow has deterministic success, validation, forbidden/not-found, rate-limit and infrastructure-error tests as currently applicable.
5. Prevent cross-use-case shared mutable state; reusable domain policies live behind narrow services/ports.
6. Migrate all callers and remove `AccountService` when no production reference remains.
7. Keep architecture/repository boundaries from `0115`/`0120` green.

## Acceptance criteria

- [ ] No monolithic `AccountService` remains in production.
- [ ] Registration, activation, profile, recovery and sensitive-data flows have distinct use-case owners.
- [ ] No extracted use-case class reproduces the original broad dependency set.
- [ ] Account controllers delegate each endpoint to one typed use case plus transport mapping.
- [ ] Existing account-flow behaviour and security outcomes remain compatible.
- [ ] Focused behavioural tests cover each extracted flow.

## Validation

Run focused account/recovery controller and use-case tests, relevant auth integration tests, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable as a required acceptance gate; transport/E2E tests must cover the unchanged account API contracts.

## Stop conditions

Mark `BLOCKED` if splitting a flow requires changing an undocumented security/rate-limit/onboarding semantic rather than merely preserving it behind a seam.

## Dependencies

- `0115` through `0120` should be `DONE` so extracted use cases are created on the final module/provider/repository direction.

## Implementation notes

Avoid replacing one 1,000-line service with a façade that still owns all logic plus thin pass-through classes. The public façade may exist temporarily for migration, but final ownership must reside in the focused use cases.

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
