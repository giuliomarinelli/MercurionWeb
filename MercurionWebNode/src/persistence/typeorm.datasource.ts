import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { join } from 'node:path'

import { getValidatedDatabaseEnvironment } from '../config/env-validation'
import { createDatabaseOptions } from './database-options'

const sourceRoot = join(__dirname, '..')

export default new DataSource({
  ...createDatabaseOptions(getValidatedDatabaseEnvironment()),
  entities: [join(sourceRoot, 'app_modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations'
})
