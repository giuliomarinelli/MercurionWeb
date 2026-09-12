# 0120 - Keep TypeORM repositories private to their owning domains

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Stop exporting `TypeOrmModule` and consuming foreign-domain repositories directly; each Nest domain must keep repository/entity-manager access private and expose only public use cases/query ports required by other domains.

Source: `BE-006` in Series `0001`.

## Context

Multiple production modules currently export `TypeOrmModule`, including User, Help, History, MoleculeCollection and SSO, allowing consumers to couple directly to another domain's persistence model. Task `0115` removes module cycles; this task prevents those cycles from reappearing through repository leakage. Transaction semantics and a canonical unit-of-work are addressed later in the DATA series, so this task establishes ownership boundaries without inventing a new transaction framework.

## Relevant files and modules

- domain `*.module.ts` files exporting `TypeOrmModule`
- cross-domain services importing foreign entities/repositories
- `MercurionWebNode/src/app_modules/user/`
- `MercurionWebNode/src/app_modules/help/`
- `MercurionWebNode/src/app_modules/history/`
- `MercurionWebNode/src/app_modules/molecule-collection/`
- `MercurionWebNode/src/app_modules/sso/`
- architecture tests introduced by `0115`

## In scope

- Inventory every `exports: [TypeOrmModule, ...]` and cross-domain `@InjectRepository()`/repository/entity-manager dependency.
- Define domain-owned query/command ports/use cases for legitimate cross-domain needs.
- Move persistence implementation behind the owning module.
- Remove `TypeOrmModule` from public exports where it exposes repositories to foreign domains.
- Prevent direct imports of another domain's entity/repository in application/use-case code except explicit neutral relation identifiers/contracts where unavoidable and documented.
- Add architecture rules preventing repository leakage across domain boundaries.

## Out of scope

- Do not redesign database schema, relations, migrations or locking.
- Do not implement the DATA-series UnitOfWork yet.
- Do not duplicate repositories in consumer modules as a workaround.
- Do not move all entities into a global persistence module.

## Decisions already made

- Repository implementations and entity managers are private infrastructure of their domain owner.
- Cross-domain callers request capabilities through application/domain ports, not persistence APIs.
- Public contracts return DTO/domain/read-model shapes rather than foreign mutable TypeORM entities whenever a transport-independent result is needed.

## Requirements

1. Generate an inventory of TypeORM exports and cross-domain repository/entity imports.
2. For each legitimate cross-domain operation, define the smallest owner-provided API/port.
3. Migrate consumers and remove direct foreign repository access.
4. Remove public `TypeOrmModule` exports after their external consumers are migrated.
5. Add static boundary rules for `@InjectRepository`, entity imports and module exports.
6. Add focused integration tests proving owner APIs preserve existing results/authorization.

## Acceptance criteria

- [ ] No domain module exports `TypeOrmModule` solely to expose its repositories/entities to another domain.
- [ ] No application/domain service injects a foreign-domain repository directly.
- [ ] Cross-domain data access goes through public typed capabilities owned by the data's domain.
- [ ] Architecture tests reject a temporary foreign-repository dependency.
- [ ] Existing API behaviour remains compatible.

## Validation

Run architecture checks, affected service/resolver/controller integration tests, Nest build, full tests/E2E and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an operation requires a cross-domain atomic transaction whose ownership cannot be preserved without the DATA-series unit-of-work design; record the exact transaction boundary rather than exposing a repository as a shortcut.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md` must be `DONE`.
- `0118-give-every-core-nest-provider-a-single-owner.md` should be `DONE`.

## Execution notes

### Feature branch
`feature/BE-006`, at supplied green `develop` base
`76d511bde300a9310ab312fc8244a89ce636f736`.
### Preflight
- Confirmed the branch was clean, exactly `feature/BE-006`, and its HEAD was
  the supplied base SHA. `git merge-base --is-ancestor
  76d511bde300a9310ab312fc8244a89ce636f736 HEAD` exited `0`; no remote
  `feature/BE-006` ref existed before this task-specific diagnostic commit.
- Confirmed no Angular, Nest, Tox21, or test watcher was active. The process
  inventory matched only the coordinator command line and the inventory probe
  itself, not a workspace-consuming runtime.
- Confirmed GitHub Actions run
  `https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34689780406`
  succeeded for the exact base SHA with successful Windows and Ubuntu
  `Quality` jobs and the stable `Required gate`.
- Confirmed prerequisite tasks 0115 and 0118 are `DONE`.
- Focused unchanged checks passed:
  - `npm run ci:nest:architecture`
  - `npm run typecheck --workspace mercurion_web_node`
  - `npm test --workspace mercurion_web_node -- --runInBand
    --runTestsByPath
    src/app_modules/sso/services/social-auth.service.spec.ts
    src/app_modules/help/services/help.service.spec.ts
    src/app_modules/history/services/history.service.spec.ts
    src/app_modules/molecule-collection/services/molecule-collection.service.spec.ts
    src/app_modules/molecule-collection/services/molecule-collection-item.service.spec.ts
    src/app_modules/molecule-collection/services/molecule-collection-item-join.service.spec.ts
    src/app_modules/user/services/user.service.spec.ts
    src/app_modules/auth/services/account.service.spec.ts
    src/app_modules/auth/services/local-dummy-auth.service.spec.ts`
    (9 suites, 21 tests).
### Preflight remediation
_None._
### Summary
Stopped at the recipe's DATA unit-of-work condition before changing production
code. The inventory found public `TypeOrmModule` exports in Help, History,
MoleculeCollection, ReleaseVersion, SSO, and User, plus direct foreign-domain
entity/repository access in Auth, Dropbox object storage, Help, History,
MoleculeCollection, Notification, SSO, Synth, and User application code.

Several occurrences can be replaced by owner-provided read/query capabilities,
but existing write behavior includes mandatory cross-domain atomic
transactions. In particular:

- `AccountService.activateUser()` updates the User aggregate and creates the
  initial MoleculeCollection items, collection, and joins with one
  `DataSource.manager.transaction`.
- `SocialAuthService.loginWithProvider()` creates the User, SSO AuthIdentity,
  initial MoleculeCollection items, collection, and joins with one
  `DataSource.manager.transaction`.
- MoleculeCollection create/touch/delete operations update collection-owned
  rows and insert/delete History rows through the same `EntityManager`.

Replacing those entity operations with ordinary owner APIs would split the
transactions and change rollback behavior. Passing `EntityManager` through
the proposed public capabilities would expose persistence infrastructure and
contradict this task. Defining a neutral transactional context, transaction
owner, or cross-domain unit of work is the deferred DATA-series decision that
this recipe explicitly forbids inventing.
### Task-specific validation performed
The focused unchanged architecture, typecheck, and nine affected service suites
listed under Preflight all passed. No task implementation validation was run
because the stop condition was reached before production edits.
### Full pre-merge CI-parity validation
Not run. Local `npm ci` and `npm run ci:check` are forbidden by repository
policy, and no implementation is eligible for pre-merge CI.
### Browser validation performed
_Not applicable._
### Commits
`BE-006 record repository-boundary unit-of-work blocker` (task-status and
diagnostic commit on `feature/BE-006`; exact SHA returned to the coordinator).
### Merge / CI
Blocked before integration; preserve and freeze the pushed feature branch.
### Rollback
_Not applicable._
### Blocker / human decision required
**DATA unit-of-work decision required.** Define the canonical owner and public
transactional contract for the existing atomic User + SSO + MoleculeCollection
onboarding workflows and the MoleculeCollection + History write workflows.
The decision must state how owner-provided capabilities participate in one
transaction without exposing TypeORM repositories or `EntityManager`. Until
that contract exists, repository privacy cannot be completed while preserving
the current transaction and rollback boundaries.
