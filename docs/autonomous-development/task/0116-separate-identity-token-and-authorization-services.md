# 0116 - Separate identity, token and authorization services

- [x] DONE
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
`feature/BE-002` at base `13c914d0b8504e8dad71d4a89d664f4bc2b2e821`.
### Preflight
Clean branch and exact base confirmed before edits. Supplied BE-001 merge CI
`34684350810` was successful for the exact base SHA, including Windows and
Ubuntu quality jobs and the stable Required gate. No workspace-consuming
process was active. Local `npm ci` and `npm run ci:check` were not run.
### Preflight remediation
_None._
### Summary
Added the narrow `IdentityReadPort` contract and bound it to the User-owned
`UserService` adapter. JwtTools now consumes only the identity port for scope
claims and no longer imports or injects `UserService`. Scope policy now consumes
the identity port and verified JWT claims, without importing or invoking
JwtTools. User scope reads decrypt and validate scope values within the
User-owned service, removing its ScopeService dependency. Removed service-level
`forwardRef()` from the identity/token/scope path and updated the guard to pass
already-verified claims to scope consistency checks.
### Task-specific validation performed
* `npm test --workspace mercurion_web_node -- --runInBand
  src/app_modules/auth/services/jwt-tools.service.spec.ts
  src/app_modules/auth/services/scope.service.spec.ts
  src/app_modules/user/services/user.service.spec.ts` — 3 suites, 3 tests
  passed.
* Auth guard and authentication focused tests — 2 suites, 4 tests passed.
* `npm run typecheck --workspace mercurion_web_node` — passed.
* `npm run build --workspace mercurion_web_node` — passed.
* `npm run lint --workspace mercurion_web_node` — passed with existing
  repository warnings only.
* Full Nest unit tests — 131 suites, 246 tests passed.
* Full Nest E2E tests — 1 suite, 1 test passed.
* `git diff --check` — passed. Service dependency inventory confirmed no
  service-level `forwardRef()` remains between JwtTools, ScopeService and
  UserService.
### Full pre-merge CI-parity validation
Complete clean-install and aggregate CI parity are reserved for GitHub Actions
by protocol; no forbidden local `npm ci` or `npm run ci:check` was executed.
The unchanged base's green CI evidence was verified before implementation.
Feature-SHA CI is owned by the coordinator after push.
### Browser validation performed
_Not applicable._
### Commits
`37f8ef71aabf9a02307a5b5cd13b32f840d92bcf` — BE-002 implementation,
committed with `--no-gpg-sign` and the Copilot coauthor trailer; pushed to
`origin/feature/BE-002`.
### Merge / CI
Feature CI run `34685155976` was dispatched for exact SHA
`37f8ef71aabf9a02307a5b5cd13b32f840d92bcf` and was still in progress at
handoff. Integration is coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
