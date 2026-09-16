# PostgreSQL integration tests

The transaction integration suite uses only a disposable PostgreSQL database.
It refuses to start unless `MERCURION_POSTGRES_INTEGRATION=true`, the database
host is loopback, and the database name starts with `mercurion_integration`.
The fixture drops the disposable schema during setup, applies every
repository migration, and drops the database during teardown. It never uses
TypeORM synchronization.

Start an isolated local service with Docker:

```powershell
docker run --rm --name mercurion-postgres-integration `
  -e POSTGRES_USER=app `
  -e POSTGRES_PASSWORD=integration-test `
  -e POSTGRES_DB=mercurion_integration `
  -p 55432:5432 `
  pgvector/pgvector:pg17
```

After the service is ready, run the suite with the explicit disposable
database opt-in:

```powershell
$env:MERCURION_POSTGRES_INTEGRATION = "true"
$env:SQL_DATABASE_TYPE = "postgres"
$env:SQL_DATABASE_HOST = "127.0.0.1"
$env:SQL_DATABASE_PORT = "55432"
$env:SQL_DATABASE_USERNAME = "app"
$env:SQL_DATABASE_PASSWORD = "integration-test"
$env:SQL_DATABASE = "mercurion_integration"
$env:SQL_DATABASE_LOGGING = "false"
$env:SQL_DATABASE_LOGGER = "advanced-console"
npm run test:integration --workspace mercurion_web_node
```

GitHub Actions provisions the same `pgvector/pgvector:pg17` service with the
`mercurion_integration` database and runs migrations and the integration suite
in the PostgreSQL migration job. The job uploads the Jest JSON result when the
suite fails.
