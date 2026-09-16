import { buildTestEnvironment } from '../src/test-utils/configuration'

const defaults = buildTestEnvironment({
  SQL_DATABASE_HOST: '127.0.0.1',
  SQL_DATABASE_PORT: '55432',
  SQL_DATABASE_USERNAME: 'app',
  SQL_DATABASE_PASSWORD: 'integration-test',
  SQL_DATABASE: 'mercurion_integration',
  SQL_DATABASE_LOGGING: 'false',
  SQL_DATABASE_LOGGER: 'advanced-console'
})

for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined && value !== undefined) {
    process.env[key] = String(value)
  }
}
