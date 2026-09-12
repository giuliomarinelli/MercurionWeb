import { registerAs } from '@nestjs/config'

import { configurationBuilders } from './config.model'
import { ConfigKey } from './config.schema'
import { getValidatedEnvironment } from './env-validation'

export const configurations = Object.values(ConfigKey).map(key =>
    registerAs(key, () => configurationBuilders[key](getValidatedEnvironment()))
)
