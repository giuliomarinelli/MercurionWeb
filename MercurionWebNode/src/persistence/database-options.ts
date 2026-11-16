import type { DataSourceOptions } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import type { DatabaseEnvironment } from '../config/config.schema'

export function createDatabaseOptions(
  environment: DatabaseEnvironment
): DataSourceOptions {
  return {
    type: 'postgres',
    host: environment.SQL_DATABASE_HOST as string,
    port: environment.SQL_DATABASE_PORT as number,
    username: environment.SQL_DATABASE_USERNAME as string,
    password: environment.SQL_DATABASE_PASSWORD as string,
    database: environment.SQL_DATABASE as string,
    logging: environment.SQL_DATABASE_LOGGING as boolean,
    logger: environment.SQL_DATABASE_LOGGER as DataSourceOptions['logger'],
    synchronize: false,
    migrationsRun: false,
    installExtensions: false,
    namingStrategy: new SnakeNamingStrategy()
  }
}
