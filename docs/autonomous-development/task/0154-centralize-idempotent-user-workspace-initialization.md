# 0154 - Centralize idempotent user-workspace initialization

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Extract the initial Mercurion molecule/collection workspace into one idempotent domain initializer used by both native account activation and first-time SSO provisioning.

Source: `DATA-005` in Series `0001`.

## Context

`AccountService.activateUser()` and `SocialAuthService.loginWithProvider()` each contain their own copy of the initial five ChEMBL molecule rows, timestamps, first collection and join creation. The duplicated seed already spans two authentication paths and can drift independently. The initializer must operate inside the caller's transaction and be safe to invoke more than once; `0155` then hardens the surrounding registration/activation/SSO commands against concurrent retries.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/account.service.ts`
- `MercurionWebNode/src/app_modules/sso/services/social-auth.service.ts`
- `MercurionWebNode/src/app_modules/molecule-collection/`
- User/workspace persistence ports
- Unit of Work from `0152`
- seed/onboarding fixtures and tests

## In scope

- Define one application/domain service for initializing a newly provisioned user's default workspace.
- Move the existing five starter molecule definitions and first-collection definition to one canonical immutable seed specification.
- Accept an active transaction context/`EntityManager`; do not open an independent transaction.
- Make repeated invocation for the same user converge to one logical starter workspace without duplicate collections, items or joins.
- Use manager-bound repositories/ports rather than reaching directly into foreign-domain implementation repositories.
- Replace both activation and SSO copies with the shared initializer.
- Add equivalence/idempotency tests for native activation and SSO provisioning.

## Out of scope

- Do not change the starter molecule identities, labels, notes or first-collection copy unless a product decision explicitly requests it.
- Do not add new onboarding UX or frontend behaviour.
- Do not solve concurrent registration/callback replay globally; `0155` owns command-level idempotency.
- Do not perform external effects from the initializer.

## Decisions already made

- Native and SSO users receive the same canonical starter-workspace semantics unless an explicit product rule says otherwise.
- Workspace initialization is a domain capability, not Auth/SSO implementation detail.
- The initializer is idempotent and transaction-context aware.
- Seed definitions have one source of truth and are not copied into tests as independent literals.

## Requirements

1. Compare the two existing onboarding blocks field-by-field and preserve the approved current seed payload.
2. Define a typed starter-workspace specification and an `initialize...` use case owned by an appropriate neutral/application boundary.
3. Persist items, collection and joins using the caller's active manager/Unit of Work.
4. Define a durable idempotency criterion for "workspace already initialized" that does not depend on a fragile localized display name alone.
5. Ensure partial prior initialization cannot result in duplicated half-workspaces; invocation either completes/reconciles safely inside one transaction or fails.
6. Replace duplicated code in account activation and SSO provisioning.
7. Add tests proving both entrypoints create equivalent data and two sequential initializer calls produce the same persisted logical workspace.

## Acceptance criteria

- [ ] Exactly one canonical starter-workspace definition exists.
- [ ] Account activation and SSO provisioning call the same initializer.
- [ ] Re-running the initializer for one user does not create duplicate starter items, collection or joins.
- [ ] Initialization participates in the caller's transaction and rolls back atomically.
- [ ] Existing starter content remains behaviourally compatible.
- [ ] Auth/SSO services no longer import entity classes merely to hand-build the starter workspace.

## Validation

Run initializer integration tests on a real disposable DB, native activation and SSO provisioning tests, duplicate-invocation tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the two existing onboarding copies have intentionally different product semantics that cannot be reconciled from current requirements, or if no durable initializer identity can be introduced without an unresolved schema/product decision.

## Dependencies

- `0152-introduce-canonical-typeorm-unit-of-work.md` must be `DONE`.
- `0151-enforce-database-integrity-constraints-and-indexes.md` should be `DONE` so idempotency can rely on appropriate DB invariants where valid.

## Implementation notes

Do not use collection display text such as `La mia prima collezione` as the sole idempotency key. User-editable/localized content is not a durable technical identity.

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
