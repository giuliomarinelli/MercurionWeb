# 0097 - Split AuthService into transport, session repository and orchestration

- [ ] DONE
- [x] BLOCKED
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

- [ ] No remaining class owns transport, session persistence/cache and multi-step auth orchestration together.
- [ ] Former `AuthService` consumers use narrow responsibility-specific APIs.
- [ ] Canonical auth/session state remains the only application source of truth.
- [ ] Login/logout/MFA/SSO/recovery flows remain behaviorally compatible.
- [ ] Service dependency graph is acyclic and covered by tests.

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
`feature/NG-011`, based on
`15d0087f70a16e915e41f2f312d30a783ea5bbdd`, preserved at
`b8fd3a6ef46fa6b562a568cd2c98f6e74d42c110`.

### Preflight
Focused validation and canonical runtime/browser preflight passed on the
feature branch. No local `npm ci` or `npm run ci:check` was run.

### Preflight remediation
_None._

### Summary
The monolithic `AuthService` was split into transport, session repository,
use-case orchestration and MFA catalog services, with consumers migrated to
narrow contracts.

### Task-specific validation performed
Typecheck, focused authentication tests, lint, runtime readiness and
protected browser-state checks passed. Route ownership inventory repair passed.

### Full pre-merge CI-parity validation
Feature run `34674533699` failed stale route ownership checks. Repair run
`34674925345` passed route ownership but failed the REST compatibility inventory
check. Final repair run `34675378480` still failed on
`AuthTransportService.isUserAvailableByEmail`: its request does not derive from
the canonical `EmailDTO` contract (`58/59` calls matched) on both Linux and
Windows. The configured repair budget is exhausted.

### Browser validation performed
Not applicable; the task was not attempted.

### Commits
Feature implementation and inventory repair commits are preserved on
`feature/NG-011`; the final feature SHA is
`b8fd3a6ef46fa6b562a568cd2c98f6e74d42c110`.

### Merge / CI
No merge was performed. The feature branch is frozen for human follow-up.

### Rollback
_Not applicable._

### Blocker / human decision required
Migrate `isUserAvailableByEmail` to derive from the canonical `EmailDTO`
contract before retrying this task in a new authorized session.
