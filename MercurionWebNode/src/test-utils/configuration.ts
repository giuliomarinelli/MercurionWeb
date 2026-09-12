import {
    createConfigurationModule
} from '../config/configuration.module'
import {
    Environment,
    environmentSchema,
    type EnvironmentProperty,
    type RawEnvironment
} from '../config/config.schema'

function rawExample(property: EnvironmentProperty): string {
    if (property.parser.kind === 'json-string-list') {
        return JSON.stringify(property.parser.example)
    }
    return String(property.parser.example)
}

export function buildTestEnvironment(
    overrides: RawEnvironment = {}
): RawEnvironment {
    return {
        ...Object.fromEntries(
            environmentSchema.entries.map(property => [
                property.source,
                rawExample(property)
            ])
        ),
        APP_ENV: Environment.Test,
        NODE_ENV: 'development',
        ...overrides
    }
}

export function createTestConfigurationModule(
    overrides: RawEnvironment = {}
) {
    return createConfigurationModule({
        environment: buildTestEnvironment(overrides)
    })
}
