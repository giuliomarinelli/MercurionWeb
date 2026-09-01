# 0120 - Keep TypeORM repositories private to their owning domains

- [ ] DONE
- [ ] BLOCKED
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
