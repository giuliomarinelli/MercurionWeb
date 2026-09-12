import {
    Environment,
    environmentProperty
} from 'src/config/config.schema'

export function parseAppEnv(raw: unknown): Environment {
    const property = environmentProperty('APP_ENV')
    const fallback = property.defaultValue
    if (fallback === undefined) {
        throw new Error('APP_ENV schema must declare its compatibility default')
    }
    if (raw === undefined) return fallback
    try {
        return property.parser.parse(raw, property.source)
    } catch {
        // Task BE-018 owns changing this pre-bootstrap compatibility fallback.
        return fallback
    }
}

export function resolveAppEnv(): Environment {
    return parseAppEnv(process.env.APP_ENV)
}

export function shouldUseEnvFile(appEnv: Environment): boolean {
    return appEnv === Environment.Development || appEnv === Environment.Test
}
