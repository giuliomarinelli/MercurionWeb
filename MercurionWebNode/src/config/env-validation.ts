import {
    databaseEnvironmentSources,
    environmentSchema,
    environmentProperty,
    type DatabaseEnvironment,
    type EnvironmentProperty,
    type RawEnvironment,
    type ValidatedEnvironment
} from './config.schema'

export interface ConfigurationDiagnostic {
    readonly source: string
    readonly message: string
}

export function validateDatabaseEnvironment(
    raw: RawEnvironment
): DatabaseEnvironment {
    const result: Record<string, unknown> = {}
    const diagnostics: ConfigurationDiagnostic[] = []

    for (const source of databaseEnvironmentSources) {
        const property = environmentProperty(source) as EnvironmentProperty
        const value = raw[source]
        if (value === undefined) {
            diagnostics.push({ source, message: 'is required' })
            continue
        }
        try {
            result[source] = property.parser.parse(value, source)
        } catch (error) {
            diagnostics.push(toConfigurationDiagnostic(source, error))
        }
    }

    if (diagnostics.length > 0) throw new ConfigurationError(diagnostics)
    return result as DatabaseEnvironment
}

export function getValidatedDatabaseEnvironment(): DatabaseEnvironment {
    return validateDatabaseEnvironment(process.env)
}

export class ConfigurationError extends Error {
    readonly code = 'INVALID_CONFIGURATION'

    constructor(readonly diagnostics: readonly ConfigurationDiagnostic[]) {
        super(
            `Invalid environment configuration:\n${diagnostics
                .map(diagnostic => `${diagnostic.source}: ${diagnostic.message}`)
                .join('\n')}`
        )
        this.name = 'ConfigurationError'
    }
}

export function toConfigurationDiagnostic(
    source: string,
    error: unknown
): ConfigurationDiagnostic {
    const message = error instanceof Error ? error.message : 'is invalid'
    return {
        source,
        message: message.startsWith(`${source} `)
            ? message.slice(source.length + 1)
            : message
    }
}

export function validateEnvironment(raw: RawEnvironment): ValidatedEnvironment {
    const result: Record<string, unknown> = {}
    const diagnostics: ConfigurationDiagnostic[] = []

    for (const property of environmentSchema.entries) {
        const rawValue = raw[property.source]
        if (rawValue === undefined) {
            if (property.defaulted) {
                result[property.source] = property.defaultValue
            } else if (property.required) {
                diagnostics.push({
                    source: property.source,
                    message: 'is required'
                })
            } else {
                result[property.source] = undefined
            }
            continue
        }

        try {
            result[property.source] = property.parser.parse(rawValue, property.source)
        } catch (error) {
            diagnostics.push(toConfigurationDiagnostic(property.source, error))
        }
    }

    if (diagnostics.length > 0) {
        throw new ConfigurationError(diagnostics)
    }

    return result as ValidatedEnvironment
}

export function getValidatedEnvironment(
    raw: RawEnvironment = process.env
): ValidatedEnvironment {
    return validateEnvironment(raw)
}
