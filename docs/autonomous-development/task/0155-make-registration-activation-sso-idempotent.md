# 0155 - Make registration, activation and SSO provisioning idempotent

- [ ] DONE
- [ ] BLOCKED

## Objective

Make native registration/activation and SSO callback provisioning safe under duplicate delivery, browser retry and concurrent execution so the same logical identity cannot create duplicate users, identities or starter workspaces.

Source: `DATA-006` in Series `0001`.

## Context

The current flows combine Redis locks/tokens, database lookups and user creation. SSO searches `AuthIdentity` and creates a new User/identity/workspace when absent; native activation consumes a token and initializes user data. Application pre-checks alone do not prevent two concurrent requests from both observing "absent" before either commits. `0154` makes workspace initialization itself idempotent; this task makes the commands that trigger creation/reconciliation idempotent end-to-end.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/account.service.ts`
- `MercurionWebNode/src/app_modules/auth/services/authentication.service.ts`
- `MercurionWebNode/src/app_modules/sso/services/social-auth.service.ts`
- User/AuthIdentity entities and repositories
- starter-workspace initializer from `0154`
- DB constraints/migrations from `0150`/`0151`
- Redis/idempotency infrastructure

## In scope

- Define durable idempotency identities for native registration, activation and SSO provider callback/provisioning.
- Back identity uniqueness with database constraints where domain truth permits it; Redis locks may optimize but are not the sole correctness mechanism.
- Ensure concurrent first-time SSO callbacks converge on one User + one provider identity.
- Ensure repeated activation of an already successfully activated logical account yields the approved idempotent outcome without repeating onboarding.
- Ensure a crash/retry between user creation and workspace initialization cannot leave permanent duplicates or an unrecoverable half-onboarded account.
- Normalize unique-constraint races into the same logical result or a stable typed conflict where the identity genuinely belongs to another account.
- Add parallel integration tests.

## Out of scope

- Do not merge two pre-existing distinct accounts merely because they share an email; account-linking policy is separate and security-sensitive.
- Do not trust provider email as the SSO identity key when provider + immutable subject is available.
- Do not make Redis availability a prerequisite for uniqueness if the database can enforce the invariant.
- Do not weaken one-time token security in order to make retries convenient.

## Decisions already made

- Provider identity is based on provider + provider subject, not mutable email.
- Idempotency is durable across process restart and does not depend only on an in-memory/Redis lock.
- One logical provisioning event creates at most one user workspace.
- A retried successful operation is distinguishable from an attacker attempting to bind an already-owned identity.

## Requirements

1. Inventory registration, activation and SSO write sequences and identify their stable event/identity keys (`jti` where appropriate, normalized registration identity, provider+subject, or a dedicated idempotency record).
2. Add/verify DB uniqueness needed to arbitrate concurrent races.
3. Run provisioning through one Unit of Work transaction where the operations are part of the same atomic DB command.
4. Invoke the idempotent initializer from `0154` rather than duplicating workspace writes.
5. Define how token revocation/consumption interacts with a retry after the original DB commit; a committed success must not be transformed into an ambiguous half-failure.
6. Handle unique-violation races by re-reading the committed winner and verifying identity equivalence before treating the retry as success.
7. Add concurrent tests with multiple identical callbacks/activations and assert one user, one identity, one starter workspace and stable returned semantics.
8. Add crash-boundary/rollback tests for failure before and after key persistence steps.

## Acceptance criteria

- [ ] Concurrent identical SSO callbacks cannot create duplicate users or identities.
- [ ] Repeated successful activation cannot duplicate starter workspace data.
- [ ] Registration/provisioning correctness survives process restart and does not rely solely on Redis locks.
- [ ] DB uniqueness races are handled deterministically without leaking raw SQL errors.
- [ ] One-time token security remains intact.
- [ ] Parallel integration tests prove at-most-one logical provisioning result.

## Validation

Run high-concurrency registration/activation/SSO integration tests against a disposable DB (and Redis fixture where required), affected auth tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if current account-linking semantics permit multiple users for the same provider subject or otherwise conflict with the durable uniqueness required here, or if retry semantics after token consumption require a product/security decision not represented in current contracts.

## Dependencies

- `0151-enforce-database-integrity-constraints-and-indexes.md`, `0152-introduce-canonical-typeorm-unit-of-work.md` and `0154-centralize-idempotent-user-workspace-initialization.md` must be `DONE`.

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
