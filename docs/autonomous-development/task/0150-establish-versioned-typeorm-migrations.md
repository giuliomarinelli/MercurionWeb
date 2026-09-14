# 0150 - Establish versioned TypeORM migrations

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/DATA-001` recovery branch. Preserved diagnostic SHA
`a2877255b4b9295926b05e972c5ed78a4ff6740c`; local and remote preserved refs
matched before recovery. Current green `develop` SHA
`59bbf8732f7fb16005ede6f0792c1f4f5f26fc13` was merged with
`--no-ff --no-gpg-sign` as merge commit `62120f20`.

### Preflight
- Branch identity and cleanliness verified with `git status --short --branch`,
  `git rev-parse HEAD`, and `git branch --show-current`; the branch was clean
  and exactly matched the supplied base SHA.
- Dependency recipes 0008, 0130, and 0132 are all `[x] DONE`.
- Exact base SHA GitHub Actions evidence verified with
  `gh run list --commit d3dd4e1f60463f447326e6c197e4826c812e6b98`; CI run
  `34710547193` completed successfully.
- No task-owned Angular, Nest, Tox21, or test-watcher process was active.
  Existing Node processes were only the dedicated Chrome DevTools MCP process.
- Entity inventory found 36 files under
  `MercurionWebNode/src/app_modules/**/Models/entities/`, including 24
  `@Entity` declarations (the remainder are entity tests).
- Current deployment configuration is PostgreSQL (`SQL_DATABASE_TYPE=postgres`
  in `MercurionWebNode/env/.env.example` and the active development
  configuration); the environment schema still accepts `mariadb`, but no
  MariaDB deployment contract was found.
- `AppModule` currently consumes `Data.pgSQL` with `autoLoadEntities: true` and
  passes the unrestricted `SQL_DATABASE_SYNCHRONIZE` value through to TypeORM.
- No repository TypeORM migrations, SQL baseline, dump, or documented schema
  snapshot was found. Kubernetes staging runs the built application against an
  externally managed PostgreSQL database, but its deployed schema/history is
  not present or otherwise deterministically discoverable in this repository.

Recovery reinspection after merging current `develop` did not change that
finding. `MercurionWebNode/env/.env.example` still declares PostgreSQL with
`SQL_DATABASE_SYNCHRONIZE=false`, while `src/config/config.schema.ts` still
accepts both `postgres` and `mariadb` and requires the unrestricted
`SQL_DATABASE_SYNCHRONIZE` property. `src/app.module.ts` still passes the
validated `Data.pgSQL` options directly to TypeORM. The Kubernetes beta
deployment supplies database settings through the external
`mercurion-web-node-env` Secret and contains no schema dump, migration table
contract, or reconciliation plan. Repository search found no TypeORM
migration directory/history or authoritative PostgreSQL schema snapshot;
`docker_sl/db/init` is only referenced as a local PostgreSQL init mount and
does not provide the deployed baseline in this repository.
### Preflight remediation
Authorized recovery completed by merging current green `develop` without
rebasing or rewriting history. No task implementation was created.

### Summary
`BLOCKED` after authorized recovery and before implementation. A safe initial
baseline still cannot be produced:
the current deployed PostgreSQL schema cannot be reconciled to the 24 loaded
entities from repository evidence alone. Generating a baseline from entity
metadata would be an undocumented assumption and could create destructive or
incompatible operations against the deployed database. No migration, DataSource,
synchronization-policy, script, or CI change was made.

### Task-specific validation performed
Not run because the required human/database authority is absent and the task
must stop before producing an unsafe migration.

### Full pre-merge CI-parity validation
Not run; local `npm ci` and `npm run ci:check` remain forbidden, and no
task-specific implementation exists.
### Browser validation performed
_Not applicable._
### Commits
Recovery merge commit `62120f20`; terminal diagnostic/status commit recorded
below.
### Merge / CI
Not applicable: the task remains blocked before implementation. The recovery
branch will be pushed after the diagnostic/status commit.
### Rollback
_Not applicable._
### Blocker / human decision required
Human/database owner must provide and approve a deterministic PostgreSQL
baseline/reconciliation plan for the deployed staging/production schema
(for example an authoritative schema dump plus confirmation of the intended
entity-to-schema mapping and any required non-destructive compatibility
migrations). Until that authority is available, do not generate or apply an
initial migration.
