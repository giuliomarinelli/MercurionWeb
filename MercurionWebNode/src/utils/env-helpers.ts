import {
    Environment,
    environmentProperty
} from 'src/config/config.schema'
import {
    ConfigurationError,
    toConfigurationDiagnostic
} from 'src/config/env-validation'

export function parseAppEnv(raw: unknown): Environment {
    const property = environmentProperty('APP_ENV')
    const fallback = property.defaultValue
    if (fallback === undefined) {
        throw new Error('APP_ENV schema must declare its compatibility default')
    }
    if (raw === undefined) return fallback
    try {
        return property.parser.parse(raw, property.source)
    } catch (error) {
        throw new ConfigurationError([
            toConfigurationDiagnostic(property.source, error)
        ])
    }
}

export function resolveAppEnv(): Environment {
    return parseAppEnv(process.env.APP_ENV)
}

export function shouldUseEnvFile(appEnv: Environment): boolean {
    return appEnv === Environment.Development || appEnv === Environment.Test
}
