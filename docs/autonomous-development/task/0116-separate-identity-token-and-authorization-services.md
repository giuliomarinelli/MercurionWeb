# 0116 - Separate identity, token and authorization services

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Eliminate the `JwtToolsService` ↔ Scope/User service cycle by separating identity lookup, token mechanics and authorization policy behind unidirectional contracts with no service-level `forwardRef()` or circular injection.

Source: `BE-002` in Series `0001`.

## Context

`JwtToolsService` currently reaches into user/session infrastructure, while `ScopeService` imports User-domain types/services and uses `forwardRef()` injection. The existing tests also mock `UserService` inside JwtTools tests, confirming token tooling knows domain identity data. Task `0115` makes the module graph acyclic; this task resolves the corresponding core service-level responsibilities rather than hiding the cycle behind tokens that still point both ways.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/jwt-tools.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/scope.service.ts`
- `MercurionWebNode/src/app_modules/user/services/user.service.ts`
- `MercurionWebNode/src/app_modules/auth/providers/jwt-keys.provider.ts`
- auth guards and authentication/session use cases consuming these services
- adjacent unit specs

## In scope

- Define a narrow identity-read port exposing only claims/scope data required by auth.
- Keep JWT sign/verify/decode/revocation mechanics independent of User-domain service implementations.
- Keep authorization/scope evaluation independent of token serialization/signing mechanics.
- Remove service-level `forwardRef()` and `@Inject(forwardRef(...))` among identity/token/scope collaborators.
- Update callers to depend on the smallest appropriate contract.
- Add contract/unit tests proving each service can be instantiated and tested independently.

## Out of scope

- Do not redesign token lifetimes, JWT algorithms or user-visible authorization policy.
- Do not move Redis session persistence into JWT tooling; `BE-010` separates session storage later.
- Do not implement new roles/scopes.
- Do not expose User repositories directly to Auth.

## Decisions already made

- Identity data lookup, token cryptography/claims and authorization policy are separate responsibilities.
- Token tooling consumes identity/session capabilities through narrow ports and never imports User-domain concrete services.
- Authorization decisions consume verified identity/claims and do not issue or persist tokens.

## Requirements

1. Inventory concrete calls between `JwtToolsService`, `ScopeService`, `UserService` and their callers.
2. Extract the minimum identity/scope read contracts required by Auth.
3. Move user-data access behind a User-owned adapter implementing those contracts.
4. Ensure JWT tooling has no dependency on User implementation classes.
5. Ensure scope policy does not call back into JWT tooling to reconstruct authentication state.
6. Remove circular injection/`forwardRef()` at service level.
7. Update unit tests to use contract fakes rather than mocking concrete foreign-domain services.

## Acceptance criteria

- [ ] JwtTools, identity lookup and scope policy form a one-directional dependency graph.
- [ ] No core auth service uses `forwardRef()` or circular DI.
- [ ] `JwtToolsService` tests do not need a concrete/mocked `UserService` module implementation.
- [ ] Existing token validation and scope decisions remain behaviourally compatible.
- [ ] Architecture tests from `0115` remain green.

## Validation

Run focused JwtTools/Scope/User/auth-guard tests, Nest build, full Nest tests/E2E, and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an existing authorization decision relies on an undocumented coupling between mutable User state and token validation that requires a security-policy decision to separate safely.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md` must be `DONE` first.

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
