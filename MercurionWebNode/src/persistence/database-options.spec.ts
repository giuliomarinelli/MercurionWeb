import {
  ConfigurationError,
  validateDatabaseEnvironment
} from '../config/env-validation'
import { createDatabaseOptions } from './database-options'

const validDatabaseEnvironment = {
  SQL_DATABASE_TYPE: 'postgres',
  SQL_DATABASE_HOST: 'localhost',
  SQL_DATABASE_PORT: '5432',
  SQL_DATABASE_USERNAME: 'app',
  SQL_DATABASE_PASSWORD: 'secret',
  SQL_DATABASE: 'mercurion',
  SQL_DATABASE_LOGGING: 'false',
  SQL_DATABASE_LOGGER: 'advanced-console'
}

describe('database migration configuration', () => {
  it('uses the validated PostgreSQL settings without schema mutation', () => {
    const options = createDatabaseOptions(
      validateDatabaseEnvironment(validDatabaseEnvironment)
    )

    expect(options).toMatchObject({
      type: 'postgres',
      port: 5432,
      synchronize: false,
      migrationsRun: false,
      installExtensions: false
    })
  })

  it('rejects an unsupported SQL dialect', () => {
    expect(() => validateDatabaseEnvironment({
      ...validDatabaseEnvironment,
      SQL_DATABASE_TYPE: 'mariadb'
    })).toThrow(ConfigurationError)
  })
})
