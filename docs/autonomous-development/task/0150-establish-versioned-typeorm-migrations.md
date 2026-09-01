# 0150 - Establish versioned TypeORM migrations

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace runtime schema synchronization with a versioned, reproducible TypeORM migration workflow that can create the MercurionWebNode database from an empty instance and verify schema drift in CI.

Source: `DATA-001` in Series `0001`.

## Context

`MercurionWebNode` currently exposes `SQL_DATABASE_SYNCHRONIZE` as runtime configuration and passes it directly to TypeORM. No migration history is present in the repository. The canonical configuration work in `0130`/`0132` makes environment resolution fail closed; this task extends that discipline to persistence. The active example configuration is PostgreSQL, while the config type still mentions MariaDB, so migration support must follow the actually supported deployment contract rather than assuming both dialects are interchangeable.

## Relevant files and modules

- `MercurionWebNode/src/config/`
- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/app_modules/**/Models/entities/`
- `MercurionWebNode/package.json`
- `MercurionWebNode/nest-cli.json`
- `MercurionWebNode/env/.env.example`
- Docker/Kubernetes database configuration
- new TypeORM migration/DataSource infrastructure

## In scope

- Add a side-effect-free TypeORM CLI/DataSource entrypoint using the canonical validated database configuration.
- Introduce a versioned migrations directory and an initial baseline migration representing the current intended schema.
- Add deterministic scripts for migration generate/create/run/revert/show/check as appropriate.
- Make `synchronize` impossible in test/staging/production and disabled by default everywhere.
- Permit synchronization only for an explicitly disposable development database if that mode remains useful and is impossible to select accidentally outside development.
- Add CI coverage that creates an empty database, runs every migration in order and proves the resulting schema is compatible with the entity metadata.
- Detect uncommitted entity/schema drift automatically.

## Out of scope

- Do not add new business constraints merely because migrations now exist; `0151` owns the integrity/index audit.
- Do not redesign entity/domain models unrelated to migration bootstrap.
- Do not modify `MercurionData` persistence unless a shared migration contract is explicitly required by an existing dependency.
- Do not modify production data manually.

## Decisions already made

- Versioned migrations are the authority for non-disposable database schema evolution.
- `synchronize: true` is never a staging/production/test migration mechanism.
- CI must prove a database can be created from zero using repository history only.
- A migration must be reviewable and deterministic; application startup must not silently mutate schema.

## Requirements

1. Inventory all TypeORM entities loaded by `MercurionWebNode` and establish the supported SQL dialect(s) from current deployment configuration.
2. Provide one TypeORM DataSource used by migration tooling without bootstrapping the Nest application or external integrations.
3. Create an initial baseline migration from the intended current schema, reviewing generated SQL for destructive or environment-specific operations.
4. If an existing deployed database baseline cannot be determined safely, mark `BLOCKED` before producing a migration that could destroy or recreate live data.
5. Remove `SQL_DATABASE_SYNCHRONIZE` as an unrestricted runtime switch; encode any disposable-development exception as an explicit environment policy.
6. Add root/project scripts so migration commands do not require hand-written CLI arguments or ad-hoc env loading.
7. Add a CI database-schema job/gate that starts from an empty database, applies migrations, initializes entity metadata and fails on pending schema drift.
8. Document how an existing environment is baselined, how a new migration is generated, reviewed, applied and reverted.

## Acceptance criteria

- [ ] The repository contains a complete ordered migration history beginning with the current baseline.
- [ ] A fresh supported database reaches the intended schema using migrations only.
- [ ] Test, staging and production cannot enable TypeORM synchronization.
- [ ] Application startup performs no implicit schema mutation.
- [ ] Entity changes without a corresponding migration fail the canonical CI gate.
- [ ] Migration commands use the same canonical database configuration semantics as the application.

## Validation

Run migration tooling against a disposable empty database: apply all migrations, inspect migration status, run the schema-drift check, execute Nest unit/E2E tests and build, then run the repository-wide CI-parity gate.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the current deployed schema cannot be reconciled safely with entity metadata, if an active database dialect has incompatible migration requirements that need a human support decision, or if creating the baseline would require destructive operations without an approved migration plan.

## Dependencies

- `0008-enforce-nest-graphql-schema-drift-check.md` must be `DONE`.
- `0130-define-every-nest-configuration-property-once.md` and `0132-fail-closed-on-unknown-app-env-values.md` should be `DONE`.

## Implementation notes

Do not make a generated migration trustworthy merely because TypeORM emitted it. Review names, types, defaults, foreign keys, identity columns and destructive statements explicitly before accepting the baseline.

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
