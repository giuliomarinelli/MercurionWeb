import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { EnvVars } from './env.vars'

function toBool(v: unknown): boolean | undefined {
    if (v === undefined) return undefined
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') return v.toLowerCase() === 'true'
    return undefined
}

function toInt(v: unknown): number | undefined {
    if (v === undefined) return undefined
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : undefined
}

export function validateEnvOrKillProcess(raw: NodeJS.ProcessEnv): EnvVars {
    const coerced: Record<string, unknown> = {
        ...raw,

        APP_PORT: toInt(raw.APP_PORT),
        APP_NATS_PORT: toInt(raw.APP_NATS_PORT),
        APP_MAX_NATS_PAYLOAD_BYTES: toInt(raw.APP_MAX_NATS_PAYLOAD_BYTES),

        SQL_DATABASE_PORT: toInt(raw.SQL_DATABASE_PORT),
        SQL_DATABASE_SYNCHRONIZE: toBool(raw.SQL_DATABASE_SYNCHRONIZE),
        SQL_DATABASE_LOGGING: toBool(raw.SQL_DATABASE_LOGGING),

        JWT_EXPIRATION_ACCESS_TOKEN: toInt(raw.JWT_EXPIRATION_ACCESS_TOKEN),
        JWT_EXPIRATION_WS_ACCESS_TOKEN: toInt(raw.JWT_EXPIRATION_WS_ACCESS_TOKEN),
        JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN: toInt(raw.JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN),
        JWT_EXPIRATION_ACTIVATION_TOKEN: toInt(raw.JWT_EXPIRATION_ACTIVATION_TOKEN),
        JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN: toInt(raw.JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN),
        JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN: toInt(raw.JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN),
        JWT_EXPIRATION_CHANGE_PASSWORD: toInt(raw.JWT_EXPIRATION_CHANGE_PASSWORD),
        JWT_EXPIRATION_ACCOUNT_RECOVERY: toInt(raw.JWT_EXPIRATION_ACCOUNT_RECOVERY),
        JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN: toInt(raw.JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN),
        MFA_CHANGE_TIME: toInt(raw.MFA_CHANGE_TIME),

        EMAIL_SMTP_PORT: toInt(raw.EMAIL_SMTP_PORT),
        EMAIL_SMTP_SECURE: toBool(raw.EMAIL_SMTP_SECURE),

        SECURE_COOKIE_HTTP_ONLY: toBool(raw.SECURE_COOKIE_HTTP_ONLY),
        SECURE_COOKIE_SECURE: toBool(raw.SECURE_COOKIE_SECURE),

        TOTP_CONFIG_BYTES: toInt(raw.TOTP_CONFIG_BYTES),
        TOTP_CONFIG_DIGITS: toInt(raw.TOTP_CONFIG_DIGITS),
        TOTP_CONFIG_PERIOD: toInt(raw.TOTP_CONFIG_PERIOD),

        SHORT_SESSION_LASTING: toInt(raw.SHORT_SESSION_LASTING),
        PERSISTENT_SESSION_LASTING: toInt(raw.PERSISTENT_SESSION_LASTING),

        REDIS_PORT: toInt(raw.REDIS_PORT)
    }

    const env = plainToInstance(EnvVars, coerced, {
        enableImplicitConversion: false
    })

    const errors = validateSync(env, {
        skipMissingProperties: false
    })

    if (errors.length > 0) {
        const msg = errors
            .map(e => {
                const constraints = e.constraints ? Object.values(e.constraints).join(', ') : 'invalid'
                return `${e.property}: ${constraints}`
            })
            .join('\n')

        throw new Error(`Invalid environment configuration:\n${msg}`)
    }

    return env
}
