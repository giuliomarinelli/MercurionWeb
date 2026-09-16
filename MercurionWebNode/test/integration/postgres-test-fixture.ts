import { DataSource } from 'typeorm'
import baseDataSource from '../../src/persistence/typeorm.datasource'

const integrationFlag = 'MERCURION_POSTGRES_INTEGRATION'
const requiredDatabasePrefix = 'mercurion_integration'

function assertDisposableDatabase(): void {
  if (process.env[integrationFlag] !== 'true') {
    throw new Error(
      `PostgreSQL integration tests require ${integrationFlag}=true`
    )
  }

  if (baseDataSource.options.type !== 'postgres') {
    throw new Error('PostgreSQL integration tests require the PostgreSQL driver')
  }
  const host = String(baseDataSource.options.host ?? '')
  const database = String(baseDataSource.options.database ?? '')
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(
      `PostgreSQL integration tests require a loopback host, received ${host}`
    )
  }
  if (!database.startsWith(requiredDatabasePrefix)) {
    throw new Error(
      `PostgreSQL integration tests require a database named with the ${requiredDatabasePrefix} prefix`
    )
  }
}

export interface PostgresIntegrationFixture {
  readonly dataSource: DataSource
  close(): Promise<void>
}

export async function createPostgresIntegrationFixture(): Promise<PostgresIntegrationFixture> {
  assertDisposableDatabase()

  const dataSource = new DataSource({
    ...baseDataSource.options,
    dropSchema: true,
    migrationsRun: false,
    synchronize: false
  })

  await dataSource.initialize()
  await dataSource.runMigrations({ transaction: 'all' })

  return {
    dataSource,
    async close(): Promise<void> {
      await dataSource.dropDatabase()
      await dataSource.destroy()
    }
  }
}
