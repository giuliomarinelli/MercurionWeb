# 0125 - Decompose GlobalGuard into composable authentication policies

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Replace the 278-line, complexity-62 `GlobalGuard.canActivate` flow with composable credential extraction, authentication, refresh, session validation and authorization-scope policies that are independently testable and transport-aware.

Source: `BE-011` in Series `0001`.

## Context

`GlobalGuard` currently handles HTTP/GraphQL context extraction, public/soft-auth metadata, access-token parsing/verification, expired-token refresh, device/session checks, scope validation, cookie/header mutation and error handling in one guard. Earlier tasks split token, session and authentication responsibilities; this task turns the global guard into a thin policy pipeline without changing authorization or refresh semantics.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/guards/global.guard.ts`
- `MercurionWebNode/src/app_modules/auth/guards/global.guard.spec.ts`
- auth metadata under `src/metadata/`
- JwtTools/identity/scope/session APIs after `0116`/`0124`
- secure-cookie and transport request-context helpers
- GraphQL/Fastify execution-context adapters

## In scope

- Define a normalized authentication request context for HTTP and GraphQL inputs used by the guard pipeline.
- Extract credential/token acquisition into a dedicated component.
- Extract access-token authentication and refresh decision/flow into testable policy/services.
- Extract session/device validation from scope authorization.
- Keep public and soft-auth metadata semantics explicit and table-tested.
- Reduce `GlobalGuard` to ordered composition of policies and final allow/deny result.
- Preserve response token/cookie mutation through a transport boundary rather than hidden policy side effects where feasible.

## Out of scope

- Do not change which routes/scopes are public, soft-auth or protected.
- Do not change refresh grace period, token/session lifetimes or device policy without a separate security decision.
- Do not merge WebSocket guard semantics into the HTTP/GraphQL guard unless they already share a transport-neutral policy; transport presentation remains distinct.
- Do not redesign typed application errors beyond using the contract available at this task point.

## Decisions already made

- Credential extraction, authentication, refresh, session validation and authorization are distinct policy stages.
- The global guard coordinates policies but does not implement their algorithms.
- Each stage has explicit typed input/output and can be table-tested without booting the full app.
- HTTP and GraphQL adapt into one transport-neutral auth context where their semantics are equivalent.

## Requirements

1. Capture every existing `canActivate` branch with table-driven tests before extraction.
2. Define the policy order and normalized context/result types.
3. Extract token verification/refresh, session/device validation and scope authorization behind narrow APIs.
4. Preserve soft-auth behaviour distinctly from hard unauthorized/forbidden outcomes.
5. Ensure refresh races/current 1.5s revocation grace behaviour are retained unless an earlier approved task changes it.
6. Remove mutable guard-wide request state such as a shared `tokenType` if it can cross request boundaries; request-specific state belongs in the invocation context.
7. Keep logging/observability metadata sufficient to diagnose which policy denied a request.

## Acceptance criteria

- [ ] `GlobalGuard.canActivate` is a thin, readable composition pipeline rather than a multi-hundred-line auth algorithm.
- [ ] Credential, authentication/refresh, session and scope policies are independently testable.
- [ ] No request-specific mutable state is shared unsafely across concurrent guard invocations.
- [ ] HTTP and GraphQL protected/public/soft-auth behaviour remains compatible.
- [ ] Table-driven tests cover every prior success/failure/refresh branch.

## Validation

Run GlobalGuard/policy/JWT/session/scope unit tests, auth REST/GraphQL E2E tests, concurrency tests for independent guard invocations, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable as a required gate.

## Stop conditions

Mark `BLOCKED` if an existing guard branch has ambiguous security semantics or if extracting it would change refresh/session/authorization policy rather than structure.

## Dependencies

- `0116-separate-identity-token-and-authorization-services.md` must be `DONE`.
- `0124-separate-session-domain-logic-from-redis-persistence.md` must be `DONE`.

## Implementation notes

Pay particular attention to singleton guard concurrency: fields that are mutated while handling one request must not influence another request.

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
