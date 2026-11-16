import { registerAs } from '@nestjs/config'

import { configurationBuilders } from './config.model'
import {
    ConfigKey,
    type ValidatedEnvironment
} from './config.schema'

export function createConfigurations(
    getEnvironment: () => ValidatedEnvironment
) {
    return Object.values(ConfigKey).map(key =>
        registerAs(key, () => configurationBuilders[key](getEnvironment()))
    )
}
