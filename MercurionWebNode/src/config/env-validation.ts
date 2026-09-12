import {
    environmentSchema,
    type RawEnvironment,
    type ValidatedEnvironment
} from './config.schema'

let validatedEnvironment: ValidatedEnvironment | undefined

export function validateEnvironment(raw: RawEnvironment): ValidatedEnvironment {
    const result: Record<string, unknown> = {}
    const errors: string[] = []

    for (const property of environmentSchema.entries) {
        const rawValue = raw[property.source]
        if (rawValue === undefined) {
            if (property.defaulted) {
                result[property.source] = property.defaultValue
            } else if (property.required) {
                errors.push(`${property.source}: is required`)
            } else {
                result[property.source] = undefined
            }
            continue
        }

        try {
            result[property.source] = property.parser.parse(rawValue, property.source)
        } catch (error) {
            errors.push(error instanceof Error ? error.message : `${property.source}: invalid`)
        }
    }

    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration:\n${errors.join('\n')}`)
    }

    return result as ValidatedEnvironment
}

export function validateEnvOrKillProcess(raw: RawEnvironment): ValidatedEnvironment {
    validatedEnvironment = validateEnvironment(raw)
    return validatedEnvironment
}

export function getValidatedEnvironment(): ValidatedEnvironment {
    return validatedEnvironment ?? validateEnvOrKillProcess(process.env)
}
