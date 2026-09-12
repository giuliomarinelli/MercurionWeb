import {
    environmentSchema,
    type RawEnvironment,
    type ValidatedEnvironment
} from './config.schema'

export interface ConfigurationDiagnostic {
    readonly source: string
    readonly message: string
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
            const message = error instanceof Error ? error.message : 'is invalid'
            diagnostics.push({
                source: property.source,
                message: message.startsWith(`${property.source} `)
                    ? message.slice(property.source.length + 1)
                    : message
            })
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
