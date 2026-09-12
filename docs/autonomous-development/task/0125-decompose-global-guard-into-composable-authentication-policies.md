# 0125 - Decompose GlobalGuard into composable authentication policies

- [x] DONE
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
`feature/BE-011`, created by the coordinator at green base
`05cfe3f88f62421a9429ea69830b7b7a4e7eccf5`.
### Preflight
- Verified the working tree was clean, the active branch was exactly
  `feature/BE-011`, and `HEAD` equalled the supplied base SHA. The base is an
  ancestor of the feature branch and no remote `feature/BE-011` ref existed
  before task work.
- Verified dependencies `0116` and `0124` are both `DONE`.
- Verified repository-local `commit.gpgSign=false`.
- Process inventory found no active Angular, Nest, Tox21, Jest, or other
  task/session-owned workspace process.
- Exact base-SHA GitHub Actions run
  [34693826608](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34693826608)
  completed successfully in full mode: `Quality (windows-latest)`,
  `Quality (ubuntu-latest)`, and `Required gate` all succeeded.
- Focused unchanged baseline:
  `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath
  src/app_modules/auth/guards/global.guard.spec.ts
  src/app_modules/auth/services/jwt-tools.service.spec.ts
  src/app_modules/auth/services/session.service.spec.ts
  src/app_modules/auth/services/scope.service.spec.ts` — 4 suites / 9 tests
  passed.
### Preflight remediation
_None._
### Summary
- Replaced the monolithic guard algorithm with a typed, ordered policy
  pipeline for transport normalization, credential extraction, access-token
  authentication/refresh, scope authorization, session/device validation,
  transport mutation, and failure cleanup.
- Removed the singleton guard's mutable `tokenType`; all request state now
  lives in an invocation-local `AuthenticationAttemptState`.
- Preserved HTTP/GraphQL adaptation, public and soft-auth handling, scope
  ordering, device/session checks, refresh token response/header mutations,
  the 1.5-second old-JTI revocation grace, hard-auth cleanup/revocation rules,
  and permission-denied behavior.
- Added policy-stage diagnostics and table-driven policy/guard tests,
  including concurrent guard invocations.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath
  src/app_modules/auth/guards/global.guard.spec.ts
  src/app_modules/auth/guards/policies/authentication-policies.spec.ts
  src/app_modules/auth/services/jwt-tools.service.spec.ts
  src/app_modules/auth/services/session.service.spec.ts
  src/app_modules/auth/services/scope.service.spec.ts
  src/app_modules/auth/auth.module.spec.ts src/provider-ownership.spec.ts` —
  7 suites / 62 tests passed.
- `npm run test:e2e --workspace mercurion_web_node -- --runInBand` — the
  repository's existing Nest E2E suite passed (1 suite / 1 test). There are no
  dedicated auth REST/GraphQL E2E files on this baseline; HTTP and GraphQL
  normalization and public/soft/protected policy behavior are covered by the
  focused table-driven tests.
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node` — passed with 0 errors; 48
  pre-existing warnings outside the changed guard/policy files remain.
- `npm run build --workspace mercurion_web_node` — passed.
- `npm run ci:nest:architecture` — passed module-graph and provider-ownership
  positive/negative checks.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run per
repository policy. The supplied base SHA has full green Windows/Linux evidence;
exact feature-SHA GitHub Actions validation is pending coordinator observation
after this branch is pushed.
### Browser validation performed
Not applicable; the recipe declares no browser/runtime gate.
### Commits
- `3fe92984` — `refactor(auth): compose global authentication policies`
- Task outcome/execution-notes commit: this commit.
### Merge / CI
Not merged. Exact feature-SHA CI and integration remain coordinator-owned.
### Feature-CI repair
- Exact feature SHA `4c5d8b00036f3b2ec01a8fd94f15abb55f609410`
  failed GitHub Actions run
  [34695410234](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34695410234)
  in `Run registered static checks` on both platforms. The actionable
  diagnostic was
  `authentication-policies.spec.ts:490:5 construct application errors through
  applicationError()`.
- Replaced the task-added direct `RpcException` construction with a narrow
  unstructured RPC exception test fixture. This preserves coverage of the
  legacy non-application `RpcException` failure branch without constructing an
  application error outside `applicationError()`, and changes no production
  authentication policy behavior.
- Focused repair validation:
  `npm run ci:errors` — passed;
  `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath
  src/app_modules/auth/guards/policies/authentication-policies.spec.ts` —
  1 suite / 37 tests passed;
  `npm run lint --workspace mercurion_web_node --
  src/app_modules/auth/guards/policies/authentication-policies.spec.ts` —
  passed with 0 errors; 48 pre-existing warnings outside the changed spec
  remain;
  `npm run ci:validate:autonomous` — passed;
  `git diff --check` — passed.
- Correction commit: this commit. Exact-SHA feature CI is pending coordinator
  observation after push.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
