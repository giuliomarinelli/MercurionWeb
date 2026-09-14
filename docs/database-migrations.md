# Database migrations

MercurionWebNode supports PostgreSQL with the `vector` extension. Versioned
TypeORM migrations are the schema authority. Application startup always uses
`synchronize: false` and never runs migrations implicitly.

All commands read the canonical `SQL_DATABASE_*` connection and logging
variables. Run them from the repository root against an explicitly selected
database:

```text
npm run db:migration:show
npm run db:migration:run
npm run db:migration:revert
npm run db:migration:generate -- --pretty
npm run db:migration:create
npm run db:migration:drift
```

## Existing environment baseline

The initial migration creates the entity-defined schema from an empty database.
It must not be executed normally against an environment whose tables already
exist. To adopt an existing database:

1. Take and verify a restorable PostgreSQL backup.
2. Point the migration environment variables at the intended environment and
   run `npm run db:migration:drift`. Stop if it proposes any statement; reconcile
   and review those differences separately.
3. Only after the schema comparison reports an exact match, record the initial
   migration without executing its DDL:
   `npm run db:migration:run -- --fake`.
4. Run `npm run db:migration:show` and retain the backup and command evidence.

Never fake a migration merely to silence drift, and never use production data
for development validation.

## Creating and applying a migration

Start from a disposable empty PostgreSQL/pgvector database, apply all committed
migrations, change the entities, then run `npm run db:migration:generate --
--pretty`. Review every type, default, index, foreign key and destructive query.
Run `npm run ci:database-schema` against a newly empty database before commit.

`db:migration:revert` reverts only the latest migration. Back up persistent data
before applying or reverting migrations and review the generated `down` method;
reverting the initial migration drops the application tables.
