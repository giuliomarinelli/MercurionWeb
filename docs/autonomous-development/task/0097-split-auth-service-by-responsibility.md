# 0097 - Split AuthService into transport, session repository and orchestration

- [ ] DONE
- [ ] BLOCKED

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
_Not started._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
