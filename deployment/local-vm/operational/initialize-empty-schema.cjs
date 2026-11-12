// Explicit one-off bootstrap of a fresh preview database. No runtime synchronize flag.
const { createRequire } = require('node:module')
const application = createRequire('/usr/src/app/package.json')
let phase = 'configuration'
let comparison
async function initialize() {
  if (process.env.APP_ENV !== 'staging') throw Error('Preview environment required')
  application('reflect-metadata')
  application('./dist/src/bootstrap/secret-file-environment.js').loadSecretFileEnvironment()
  const { getValidatedDatabaseEnvironment } = application('./dist/src/config/env-validation.js')
  const { createDatabaseOptions } = application('./dist/src/persistence/database-options.js')
  // Importing decorators registers exactly the entities in the real application modules.
  // No Nest application or external-provider clients are instantiated here.
  application('./dist/src/app.module.js')
  const { EntitiesMetadataStorage } = application('@nestjs/typeorm/dist/entities-metadata.storage.js')
  const entities = EntitiesMetadataStorage.getEntitiesByDataSource('default')
  if (!entities.length) throw Error('No registered application entities')
  const { DataSource } = application('typeorm')
  const configuration = getValidatedDatabaseEnvironment()
  if (configuration.SQL_DATABASE !== 'mercurion_preview') throw Error('Unexpected target database')
  const source = new DataSource({ ...createDatabaseOptions(configuration), entities })
  phase = 'connect'
  await source.initialize()
  try {
    const [{ count }] = await source.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")
    if (process.argv.includes('--verify-existing')) {
      phase = 'compare-schema'
      // PostgreSQL introspection removes explicit JSON casts. Compare literal
      // JSON defaults structurally, retaining all other metadata checks.
      for (const entity of source.entityMetadatas) for (const column of entity.columns) {
        if (['json', 'jsonb'].includes(column.type) && typeof column.default === 'function') {
          const literal = /^'((?:''|[^'])*)'::jsonb?$/.exec(column.default())
          if (literal) column.default = JSON.parse(literal[1].replaceAll("''", "'"))
        }
      }
      const difference = await source.driver.createSchemaBuilder().log()
      comparison = { upCount: difference.upQueries.length, downCount: difference.downQueries.length,
        operations: difference.upQueries.map(item => item.query.split(/\s+/).slice(0, 3).map(word => /^[A-Za-z_]+$/.test(word) ? word : '<identifier>').join(' ')) }
      if (difference.upQueries.length || difference.downQueries.length) throw Error('Existing schema requires explicit migration review')
      console.log(JSON.stringify({ status: 'compatible', entityCount: entities.length }))
    } else {
      if (count !== 0) throw Error('Database is not empty; migrations or recovery require separate review')
      await source.synchronize(false)
      console.log(JSON.stringify({ status: 'initialized', entityCount: entities.length }))
    }
  } finally {
    await source.destroy()
  }
}
initialize().catch(error => {
  console.error(JSON.stringify({ code: 'EMPTY_PREVIEW_SCHEMA_INITIALIZATION_FAILED', phase, errorType: error.name, comparison }))
  process.exitCode = 1
})
