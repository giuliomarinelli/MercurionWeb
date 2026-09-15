import dataSource from '../src/persistence/typeorm.datasource'

async function checkDatabaseDrift(): Promise<void> {
  await dataSource.initialize()
  try {
    const drift = await dataSource.driver.createSchemaBuilder().log()
    if (drift.upQueries.length > 0 || drift.downQueries.length > 0) {
      const statements = drift.upQueries.map(query => query.query).join('\n')
      throw new Error(`Entity metadata has schema drift:\n${statements}`)
    }
    console.log('Database schema matches the entity metadata.')
  } finally {
    await dataSource.destroy()
  }
}

void checkDatabaseDrift().catch(error => {
  console.error(error)
  process.exitCode = 1
})
