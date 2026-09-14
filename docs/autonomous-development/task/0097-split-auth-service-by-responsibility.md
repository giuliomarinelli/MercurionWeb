# 0097 - Split AuthService into transport, session repository and orchestration

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Eliminate the oversized, overlapping responsibilities of `AuthService` by separating authentication transport, credential/session repository concerns and use-case orchestration behind minimal public APIs that integrate with the canonical auth facade/store.

Source: `NG-011` in Series `0001`.

## Context

`MercurionWebNg/src/app/services/auth.service.ts` is a large root service used throughout login/MFA/SSO/session flows. Earlier FE tasks establish one canonical auth state machine, typed persistence/pre-auth/redirect adapters and atomic session ownership. Tasks `0093` and `0094` move page orchestration onto those contracts. This task must now make the service layer match that architecture rather than leave a monolithic implementation underneath the facade.

## Relevant files and modules

- `MercurionWebNg/src/app/services/auth.service.ts`
- auth service specs and direct consumers
- canonical auth facade/store/session entity/persistence adapters from FE tasks
- authentication REST models/endpoints/contracts
- JWT/fingerprint/session helpers currently called by `AuthService`

## In scope

- Inventory the current public methods and classify each as transport, session/credential repository, orchestration/use case or obsolete compatibility surface.
- Extract a narrow authentication transport client that only performs protocol calls and mapping.
- Extract/align credential/session repository responsibilities with the canonical session/persistence adapters.
- Move multi-step login/logout/recovery/exchange orchestration into explicit use cases/facade commands.
- Remove duplicated token/cache/storage ownership already handled by canonical stores/adapters.
- Migrate consumers to the smallest appropriate API and delete obsolete passthrough methods.

## Out of scope

- Do not redesign backend auth endpoints/security semantics.
- Do not create a second canonical auth store.
- Do not absorb realtime/socket synchronization; task `0098` owns that boundary.
- Do not keep the old service as a permanent god-object facade forwarding every extracted method.

## Decisions already made

- Transport does not own UI/session state.
- Session repository/persistence does not perform navigation/UI orchestration.
- Use cases compose transport and repositories and publish state through the canonical auth facade/store.
- Public APIs are minimized after consumer migration.

## Requirements

1. Map every existing `AuthService` public method to a single responsibility/owner.
2. Keep raw HTTP details inside the transport adapter.
3. Keep session credential creation/cleanup atomic through the canonical session contract.
4. Ensure logout/recovery/login semantics established by FE tasks remain unchanged.
5. Prevent circular dependencies between facade, transport, repository and realtime layers.
6. Add focused tests for transport mapping, repository lifecycle and use-case orchestration.
7. Remove direct component imports/usage of low-level auth transport where facade commands exist.

## Acceptance criteria

- [x] No remaining class owns transport, session persistence/cache and multi-step auth orchestration together.
- [x] Former `AuthService` consumers use narrow responsibility-specific APIs.
- [x] Canonical auth/session state remains the only application source of truth.
- [x] Login/logout/MFA/SSO/recovery flows remain behaviorally compatible.
- [x] Service dependency graph is acyclic and covered by tests.

## Validation

Run auth transport/repository/use-case/facade tests plus all canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, smoke-test credential login, logout, account recovery entry, MFA/SSO handoffs supported locally and session refresh/reload behavior. Verify no duplicate HTTP requests/session writes and no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a current `AuthService` method has ambiguous security ownership/semantics that cannot be classified without a security/product decision.

## Dependencies

- Canonical FE auth/session architecture through `0038` must be `DONE`.
- `0093` and `0094` must be `DONE` so page flows already target the canonical facade/use-case boundary.

## Execution notes

### Feature branch
`feature/NG-011`, based on `15d0087f70a16e915e41f2f312d30a783ea5bbdd`.

### Preflight
- Confirmed clean `feature/NG-011` at the supplied base SHA; exact base Actions
  run `34673377438` completed successfully for the NG-010 merge SHA.
- No local `npm ci` or `npm run ci:check` was run.
- Canonical runtime preflight started Tox21, Nest and Angular in the required
  order. Nest and Angular compiled with zero errors; nginx readiness completed
  two consecutive rounds at `/health` and `/`.

### Preflight remediation
_None._

### Summary
Replaced the monolithic `AuthService` with responsibility-specific
`AuthTransportService`, `AuthSessionRepository`, `AuthUseCasesService` and
`AuthMfaCatalogService`. Raw HTTP mapping is isolated in the transport,
session/token/cache/refresh-lock ownership is atomic in the repository, and
logout, session revocation and WebSocket refresh orchestration are explicit
use-case commands. Facade, interceptor, MFA, SSO, settings, header, recovery,
registration, help, realtime and admin consumers now depend on the narrow
contract they use. The old service and passthrough spec were removed.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- Focused Angular specs for transport, use cases, MFA strategy and SSO:
  `npx ng test --watch=false --include ...` — 10 specs passed.
- `npm run lint --workspace mercurion_web_ng -- --no-warn-ignored` — passed
  with existing warnings only.
- CI repair for run `34674533699` / feature SHA
  `021016767910f12dbedd6a994945c0f63a7adcc2`: regenerated only
  `docs/architecture/rest-route-ownership.json` with
  `node scripts/check-rest-route-ownership.mjs --write`. The reviewed drift
  updates ownership references for the Auth-service consumers of logout,
  maintenance, WebSocket refresh, logout-from-session/all-sessions,
  registration, email availability, and login step routes.
- `node scripts/check-rest-route-ownership.mjs` — passed:
  72 routes classified and inventory current.
- `node scripts/test-rest-route-ownership-policy-negative.mjs` — passed.
- Final CI repair for run `34674925345` / feature SHA
  `bf4ce5841a97f5a498e64c953a4e528115c7006f`: regenerated only
  `docs/architecture/rest-contract-compatibility.json` with
  `node scripts/check-rest-compatibility.mjs --write`. The reviewed diff is
  limited to the task-owned AuthTransportService route references and their
  extracted request/header expressions for email availability, login, logout,
  WebSocket refresh, registration, maintenance and SSO. No application source
  or unrelated inventory was changed.
- `node scripts/check-rest-compatibility.mjs` — inventory regeneration
  completed, but the focused checker still reports the task-owned
  `AuthTransportService.isUserAvailableByEmail` request as not deriving from
  the canonical `EmailDTO` contract (`58/59` calls matched). No application
  behavior was altered in this final repair attempt.

### Full pre-merge CI-parity validation
Exact feature-SHA run `34674533699` passed all CI checks through generated
contracts on both Linux and Windows, then failed only in registered static
checks because the route ownership references were stale after the Auth
service split. Repair runs `34674925345` and `34675378480` isolated the final
canonical-request derivation gap. During authorized recovery that gap was
fixed and all focused gates passed; a new exact feature-SHA CI run remains
coordinator-owned.

### Browser validation performed
Through `http://localhost:8888`, canonical Tox21/Nest/Angular runtime reached
two complete readiness rounds (`/health` and `/login`). A fresh ordinary
credential login reached the protected Dashboard as `Test`; reloading retained
the same protected state. Logout issued one observed
`DELETE /api/authentication/logout`, returned to `/welcome`, revoked the
session and switched the socket to public mode. The public login exposed the
Google, GitHub and Discord SSO handoffs, and `Recupera account` opened
`/account-recovery` with the expected heading. The development test identity
intentionally bypasses MFA, so no MFA challenge was synthesized. Browser
console inspection reported no errors. All task-owned runtime processes were
stopped afterward.

### Commits
- `a88a3bb2` — refresh generated REST route ownership references after the
  Auth service split.
- `87b260a9` — record the CI repair in the task execution notes.
- `b8fd3a6e` — refresh the REST compatibility inventory after the auth service
  split.
- pending — derive email availability from canonical `EmailDTO` and record the
  authorized recovery validation.

### Merge / CI
Feature SHA requires exact-SHA Actions `Required gate` before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None. `isUserAvailableByEmail` now constructs an explicit `EmailDTO`; the REST
compatibility gate reports `59/59` client calls matched to Nest routes.

### Authorized recovery (2026-09-13)

Verified local and remote `feature/NG-011` at preserved SHA
`b8fd3a6ef46fa6b562a568cd2c98f6e74d42c110`, then merged exact green
`develop@1d58c103ed1663337179e4c2e0798c12b5651d32` with
`--no-ff --no-gpg-sign`. The only merge conflict was the task's historical
outcome metadata.

Changed `AuthTransportService.isUserAvailableByEmail` from an inline
`satisfies EmailDTO` expression to an explicit typed DTO consumed by the HTTP
call. The regenerated compatibility inventory changed only that call from
unmatched/non-canonical to matched/canonical.

Recovery validation passed: Angular lint, typecheck, production build,
`476/476` Angular tests, REST route ownership, REST compatibility and
`git diff --check`. The build retained the existing initial-bundle budget
warning. Browser evidence is recorded above. Exact feature-SHA and post-merge
CI remain coordinator-owned.
