import type { UUID } from 'crypto'
import { isUUID } from 'class-validator'

export enum Environment {
    Development = 'development',
    Staging = 'staging',
    Production = 'production',
    Test = 'test'
}

export enum ConfigKey {
    App = 'App',
    Data = 'Data',
    Jwt = 'Jwt',
    SecureCookie = 'SecureCookie',
    Email = 'Email',
    Sms = 'Sms',
    Totp = 'Totp',
    Session = 'Session',
    Dropbox = 'Dropbox',
    Meilisearch = 'Meilisearch',
    Cloudflare = 'Cloudflare',
    Redis = 'Redis',
    SSO = 'SSO',
    Feedback = 'Feedback'
}

export type RawEnvironment = Record<string, string | number | boolean | undefined>

export interface EnvironmentValueParser<T> {
    readonly kind: 'string' | 'boolean' | 'integer' | 'enum' | 'json-string-list' | 'uuid' | 'nats-host'
    readonly constraint: string
    readonly example: T
    parse(value: unknown, source: string): T
}

export interface EnvironmentProperty<
    Name extends string = string,
    Value = unknown,
    Required extends boolean = boolean,
    Defaulted extends boolean = boolean
> {
    readonly source: Name
    readonly required: Required
    readonly defaulted: Defaulted
    readonly defaultValue?: Value
    readonly parser: EnvironmentValueParser<Value>
}

function invalid(source: string, constraint: string): never {
    throw new Error(`${source} must be ${constraint}`)
}

function stringParser(options: {
    nonEmpty?: boolean
    example?: string
} = {}): EnvironmentValueParser<string> {
    const constraint = options.nonEmpty ? 'a non-empty string' : 'a string'
    return {
        kind: 'string',
        constraint,
        example: options.example ?? 'value',
        parse(value, source) {
            if (typeof value !== 'string') return invalid(source, constraint)
            if (options.nonEmpty && value.length === 0) return invalid(source, constraint)
            return value
        }
    }
}

function booleanParser(): EnvironmentValueParser<boolean> {
    return {
        kind: 'boolean',
        constraint: 'the boolean true or false',
        example: true,
        parse(value, source) {
            if (typeof value === 'boolean') return value
            if (typeof value !== 'string') return invalid(source, 'the boolean true or false')
            const normalized = value.trim().toLowerCase()
            if (normalized === 'true') return true
            if (normalized === 'false') return false
            return invalid(source, 'the boolean true or false')
        }
    }
}

function integerParser(
    minimum = Number.MIN_SAFE_INTEGER,
    maximum = Number.MAX_SAFE_INTEGER
): EnvironmentValueParser<number> {
    const constraint = minimum === Number.MIN_SAFE_INTEGER && maximum === Number.MAX_SAFE_INTEGER
        ? 'an integer'
        : maximum === Number.MAX_SAFE_INTEGER
            ? `an integer greater than or equal to ${minimum}`
            : `an integer between ${minimum} and ${maximum}`
    return {
        kind: 'integer',
        constraint,
        example: Math.max(minimum, 1),
        parse(value, source) {
            if (typeof value !== 'number' && typeof value !== 'string') {
                return invalid(source, constraint)
            }
            if (typeof value === 'string' && value.trim().length === 0) {
                return invalid(source, constraint)
            }
            const parsed = typeof value === 'number' ? value : Number(value)
            if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
                return invalid(source, constraint)
            }
            return parsed
        }
    }
}

function natsHostParser(): EnvironmentValueParser<string> {
    const constraint = [
        'a NATS host URL using nats or tls',
        'without credentials, port, path, query, or fragment'
    ].join(' ')
    return {
        kind: 'nats-host',
        constraint,
        example: 'nats://localhost',
        parse(value, source) {
            if (
                typeof value !== 'string' ||
                value.length === 0 ||
                value.trim() !== value
            ) {
                return invalid(source, constraint)
            }

            try {
                const endpoint = new URL(value)
                const validProtocols = new Set(['nats:', 'tls:'])
                if (
                    !validProtocols.has(endpoint.protocol) ||
                    endpoint.hostname.length === 0 ||
                    endpoint.username.length > 0 ||
                    endpoint.password.length > 0 ||
                    endpoint.port.length > 0 ||
                    endpoint.pathname.length > 0 ||
                    endpoint.search.length > 0 ||
                    endpoint.hash.length > 0
                ) {
                    return invalid(source, constraint)
                }
                return value
            } catch {
                return invalid(source, constraint)
            }
        }
    }
}

function enumParser<const Value extends string>(
    values: readonly Value[]
): EnvironmentValueParser<Value> {
    const constraint = `one of: ${values.join(', ')}`
    return {
        kind: 'enum',
        constraint,
        example: values[0],
        parse(value, source) {
            if (typeof value === 'string' && values.includes(value as Value)) {
                return value as Value
            }
            return invalid(source, constraint)
        }
    }
}

function jsonStringListParser(): EnvironmentValueParser<string[]> {
    return {
        kind: 'json-string-list',
        constraint: 'a JSON array of strings',
        example: ['http://localhost'],
        parse(value, source) {
            if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                return value
            }
            if (typeof value !== 'string') return invalid(source, 'a JSON array of strings')
            try {
                const parsed: unknown = JSON.parse(value)
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                    return parsed
                }
            } catch {
                // The common validation diagnostic below is more useful than JSON parser details.
            }
            return invalid(source, 'a JSON array of strings')
        }
    }
}

function uuidParser(): EnvironmentValueParser<UUID> {
    return {
        kind: 'uuid',
        constraint: 'a UUID',
        example: '00000000-0000-4000-8000-000000000001',
        parse(value, source) {
            if (typeof value === 'string' && isUUID(value)) return value as UUID
            return invalid(source, 'a UUID')
        }
    }
}

function required<Name extends string, Value>(
    source: Name,
    parser: EnvironmentValueParser<Value>
): EnvironmentProperty<Name, Value, true, false> {
    return { source, required: true, defaulted: false, parser }
}

function optional<Name extends string, Value>(
    source: Name,
    parser: EnvironmentValueParser<Value>
): EnvironmentProperty<Name, Value, false, false> {
    return { source, required: false, defaulted: false, parser }
}

function defaulted<Name extends string, Value>(
    source: Name,
    parser: EnvironmentValueParser<Value>,
    defaultValue: Value
): EnvironmentProperty<Name, Value, false, true> {
    return { source, required: false, defaulted: true, defaultValue, parser }
}

export function defineEnvironmentSchema<
    const Entries extends readonly EnvironmentProperty[]
>(...entries: Entries): {
    readonly entries: Entries
    readonly sources: readonly Entries[number]['source'][]
} {
    const sources = entries.map(entry => entry.source)
    const duplicate = sources.find((source, index) => sources.indexOf(source) !== index)
    if (duplicate) throw new Error(`Duplicate environment source: ${duplicate}`)
    return { entries, sources }
}

const string = () => stringParser()
const nonEmptyString = () => stringParser({ nonEmpty: true })
const positiveInteger = () => integerParser(1)

export const environmentSchema = defineEnvironmentSchema(
    defaulted('APP_ENV', enumParser(Object.values(Environment)), Environment.Development),
    defaulted('LOCAL_DUMMY_AUTH', booleanParser(), false),
    defaulted('DISABLE_TURNSTILE', booleanParser(), false),
    optional('LOCAL_TEST_ACCOUNT_EMAIL', string()),
    defaulted('NODE_ENV', enumParser(['development', 'production'] as const), 'development'),

    required('APP_PORT', positiveInteger()),
    required('APP_NATS_PORT', integerParser(1, 65535)),
    required('APP_NATS_HOST', natsHostParser()),
    required('APP_PROJECT_NAME', string()),
    required('APP_GLOBAL_NAME', string()),
    required('APP_PROJECT_ID', uuidParser()),
    required('APP_CORS_ORIGINS', jsonStringListParser()),
    required('APP_USER_ACTIVATION_ORIGIN', string()),
    required('APP_HOST', string()),
    required('APP_SESSION_SIGNATURE_SECRET', string()),
    required('APP_PASSWORD_PEPPER', string()),
    required('APP_REDIS_ID_HMAC_SECRET', string()),
    required('APP_AES_SECRET', string()),
    optional('APP_VERSION', string()),
    required('APP_DEVICE_ID_SIGNATURE_SECRET', string()),
    required('APP_SUPPORT_EMAIL', string()),
    required('APP_MAX_NATS_PAYLOAD_BYTES', positiveInteger()),

    required('SQL_DATABASE_TYPE', enumParser(['postgres', 'mariadb'] as const)),
    required('SQL_DATABASE_HOST', string()),
    required('SQL_DATABASE_PORT', positiveInteger()),
    required('SQL_DATABASE_USERNAME', string()),
    required('SQL_DATABASE_PASSWORD', string()),
    required('SQL_DATABASE', string()),
    required('SQL_DATABASE_SYNCHRONIZE', booleanParser()),
    required('SQL_DATABASE_LOGGING', booleanParser()),
    required('SQL_DATABASE_LOGGER', enumParser([
        'debug',
        'file',
        'simple-console',
        'advanced-console'
    ] as const)),

    required('JWT_SECRETS_PRE_AUTHORIZATION_TOKEN', string()),
    required('JWT_SECRETS_ACTIVATION_TOKEN', string()),
    required('JWT_SECRETS_PHONE_NUMBER_VERIFICATION_TOKEN', string()),
    required('JWT_SECRETS_EMAIL_VERIFICATION_TOKEN', string()),
    required('JWT_SECRETS_EMAIL_MFA_ACTIVATION', string()),
    required('JWT_SECRETS_SMS_MFA_ACTIVATION', string()),
    required('JWT_SECRETS_APP_MFA_ACTIVATION', string()),
    required('JWT_SECRETS_EMAIL_MFA_INACTIVATION', string()),
    required('JWT_SECRETS_SMS_MFA_INACTIVATION', string()),
    required('JWT_SECRETS_APP_MFA_INACTIVATION', string()),
    required('JWT_SECRETS_CHANGE_PASSWORD', string()),
    required('JWT_SECRETS_ACCOUNT_RECOVERY', string()),
    required('JWT_SECRETS_SSO_PRE_AUTHORIZATION_TOKEN', string()),

    required('JWT_EXPIRATION_ACCESS_TOKEN', positiveInteger()),
    required('JWT_EXPIRATION_WS_ACCESS_TOKEN', positiveInteger()),
    required('JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN', positiveInteger()),
    required('JWT_EXPIRATION_ACTIVATION_TOKEN', positiveInteger()),
    required('JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN', positiveInteger()),
    required('JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN', positiveInteger()),
    required('JWT_EXPIRATION_CHANGE_PASSWORD', positiveInteger()),
    required('JWT_EXPIRATION_ACCOUNT_RECOVERY', positiveInteger()),
    required('JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN', positiveInteger()),
    required('MFA_CHANGE_TIME', positiveInteger()),

    required('JWT_AUD_API', string()),
    required('JWT_AUD_WS', string()),
    required('JWT_AUD_AUTH', string()),

    required('SECURE_COOKIE_PATH', string()),
    required('SECURE_COOKIE_HTTP_ONLY', booleanParser()),
    required('SECURE_COOKIE_SAME_SITE', enumParser(['strict', 'lax', 'none'] as const)),
    required('SECURE_COOKIE_SECURE', booleanParser()),
    required('SECURE_COOKIE_DOMAIN', string()),
    required('SECURE_COOKIE_SECRET', string()),

    required('EMAIL_SMTP_HOST', string()),
    required('EMAIL_SMTP_PORT', positiveInteger()),
    required('EMAIL_SMTP_SECURE', booleanParser()),
    required('EMAIL_USERNAME', string()),
    required('EMAIL_PASSWORD', string()),
    required('EMAIL_DEFAULT_FROM', string()),

    required('TWILIO_ACCOUNT_SID', string()),
    required('TWILIO_AUTH_TOKEN', string()),
    required('TWILIO_NUMBER', string()),
    required('TWILIO_FROM', string()),

    required('TOTP_CONFIG_BYTES', positiveInteger()),
    required('TOTP_CONFIG_DIGITS', positiveInteger()),
    required('TOTP_CONFIG_PERIOD', positiveInteger()),
    required('TOTP_CONFIG_PEPPER', string()),

    required('SHORT_SESSION_LASTING', positiveInteger()),
    required('PERSISTENT_SESSION_LASTING', positiveInteger()),
    required('SESSION_ZERO_ID', uuidParser()),

    required('DROPBOX_API_URL', string()),
    required('DROPBOX_AUTH_URL', string()),
    required('DROPBOX_APP_KEY', string()),
    required('DROPBOX_APP_SECRET', string()),
    required('DROPBOX_REDIRECT_URI', string()),
    required('DROPBOX_TOKEN_URL', string()),

    required('MEILISEARCH_HOST', string()),
    required('MEILISEARCH_MASTER_KEY', string()),
    required('CLOUDFLARE_SECRET_KEY', string()),

    required('REDIS_HOST', string()),
    required('REDIS_PORT', positiveInteger()),
    required('REDIS_PASSWORD', nonEmptyString()),

    required('GOOGLE_CLIENT_ID', string()),
    required('GOOGLE_CLIENT_SECRET', string()),
    required('GOOGLE_REDIRECT_URI', string()),
    required('GITHUB_CLIENT_ID', string()),
    required('GITHUB_CLIENT_SECRET', string()),
    required('GITHUB_REDIRECT_URI', string()),
    required('LINKEDIN_CLIENT_ID', string()),
    required('LINKEDIN_CLIENT_SECRET', string()),
    required('LINKEDIN_REDIRECT_URI', string()),
    required('DISCORD_CLIENT_ID', string()),
    required('DISCORD_CLIENT_SECRET', string()),
    required('DISCORD_REDIRECT_URI', string()),

    required('UM_FEEDBACK_ANON_AUTHOR_KEY', string())
)

type PropertyValue<Property> =
    Property extends EnvironmentProperty<string, infer Value, infer Required, infer Defaulted>
        ? Required extends true
            ? Value
            : Defaulted extends true
                ? Value
                : Value | undefined
        : never

export type ValidatedEnvironment = {
    [Property in typeof environmentSchema.entries[number] as Property['source']]:
        PropertyValue<Property>
}

export function environmentProperty<Name extends keyof ValidatedEnvironment>(
    source: Name
): Extract<typeof environmentSchema.entries[number], { source: Name }> {
    const property = environmentSchema.entries.find(entry => entry.source === source)
    if (!property) throw new Error(`Unknown environment source: ${source}`)
    return property as Extract<typeof environmentSchema.entries[number], { source: Name }>
}
