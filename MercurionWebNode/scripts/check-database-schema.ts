import dataSource from '../src/persistence/typeorm.datasource'
import { checkDatabaseIntegrity, checkIntegrityMigrationBackfill } from './check-database-integrity'
import { checkUnitOfWork } from './check-unit-of-work'

async function checkDatabaseSchema(): Promise<void> {
  await dataSource.initialize()
  try {
    const executed = await dataSource.runMigrations({ transaction: 'all' })
    if (executed.length === 0 && await dataSource.showMigrations()) {
      throw new Error('Database migrations remain pending')
    }

    const drift = await dataSource.driver.createSchemaBuilder().log()
    if (drift.upQueries.length > 0 || drift.downQueries.length > 0) {
      const statements = drift.upQueries.map(query => query.query).join('\n')
      throw new Error(`Entity metadata has uncommitted schema drift:\n${statements}`)
    }

    await checkUnitOfWork(dataSource)
    await checkIntegrityMigrationBackfill(dataSource)
    await checkDatabaseIntegrity(dataSource)

    console.log(`Database schema is current (${dataSource.migrations.length} migrations).`)
  } finally {
    await dataSource.destroy()
  }
}

void checkDatabaseSchema().catch(error => {
  console.error(error)
  process.exitCode = 1
})
