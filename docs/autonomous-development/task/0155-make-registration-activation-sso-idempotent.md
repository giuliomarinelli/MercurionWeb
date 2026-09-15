# 0155 - Make registration, activation and SSO provisioning idempotent

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/DATA-006`, based on `dd7595959ec68f1163a33af1c37bc9b776aee853`.
### Preflight
Clean branch and exact base SHA verified before edits. GitHub Actions run
`35032501838` for the exact base SHA completed successfully with the
classification, Ubuntu, Windows, and `Required gate` jobs green. No Angular,
Nest, Tox21, Chrome, or runtime process was started because browser validation
is not applicable.
### Preflight remediation
None.
### Summary
Added a durable normalized pending-registration identity with a database
unique index, and made native registration persist through the shared Unit of
Work. Added a durable activation receipt keyed by JWT `jti`, encrypted recovery
code replay semantics, row-locked activation, and atomic initializer/receipt
persistence with token revocation deferred until commit. SSO provisioning now
relies on the provider+immutable-subject database uniqueness constraint and
re-reads the committed winner after a unique-constraint race instead of
exposing SQL errors. Existing DATA-005/0154 initializer is reused.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm test --workspace mercurion_web_node -- --runInBand src/app_modules/sso/services/social-auth.service.spec.ts src/app_modules/auth/application/account-flow-kernel.spec.ts src/persistence/transaction-context.spec.ts` — passed, 3 suites / 7 tests.
- `npm run lint --workspace mercurion_web_node` — passed with `--max-warnings 0`.
- `npm run build --workspace mercurion_web_node` — passed.
- `git diff --check` — passed.
- `npm run migration:check --workspace mercurion_web_node` — could not run because this
  worker has no database environment variables (`SQL_DATABASE_*`); this is an
  environment-only schema-observation limitation, not a source or migration
  diagnostic. Clean-install and aggregate CI checks remain Actions-owned.
### Full pre-merge CI-parity validation
Not run locally by policy (`npm ci` and `npm run ci:check` are forbidden);
exact feature-SHA Actions validation is coordinator-owned.
### Browser validation performed
Not applicable; backend-only recipe.
### Commits
`f6561c965582bca7d2f049ae0dd142d5cf240d8d` — Make registration activation
and SSO idempotent (includes the required Copilot co-author trailer).
### CI repair attempt 1
Exact feature SHA `0ee386e775fced30f94b71c25a2d978e47620915` failed Actions run
`35033604446` because the Windows prerequisite job `104597595010` and the
Ubuntu prerequisite job both failed at `ci:architecture` -> `nest-orphans`;
the orphan diagnostic identified only
`src/persistence/migrations/1789560000000-AddAuthIdempotency.ts`. The narrow
DATA-005 reachability convention was followed by registering this migration
under the `typeorm-cli` dynamic entrypoints in
`MercurionWebNode/nest-reachability.config.json`. This preserves the orphan
policy and changes no runtime or migration behavior.
Focused repair validation:
- `npm run nest:orphans:check` — passed, including its negative control.
- `npm run ci:architecture` — passed.
- `npm test --workspace mercurion_web_node -- --runInBand src/app_modules/sso/services/social-auth.service.spec.ts src/app_modules/auth/application/account-flow-kernel.spec.ts src/persistence/transaction-context.spec.ts` — passed, 3 suites / 7 tests.
No Angular, Nest, Tox21, Chrome, or runtime process was started; browser
validation remains not applicable.
### Repair commit
Pending task repair commit.
### Merge / CI
Feature branch publication follows the task commit. No develop/master changes.
### Rollback
Not applicable.
### Blocker / human decision required
None.
