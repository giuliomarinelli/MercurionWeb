import type { MailerOptions } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter'
import { join } from 'path'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import {
    ConfigKey,
    type ValidatedEnvironment
} from './config.schema'
import { createNatsServerUrl } from './nats-endpoint'

type ConfigurationBuilder = (environment: ValidatedEnvironment) => object

export const configurationBuilders = {
    [ConfigKey.App]: (environment: ValidatedEnvironment) => ({
        nodeEnv: environment.NODE_ENV,
        env: environment.APP_ENV,
        localDummyAuth: environment.LOCAL_DUMMY_AUTH,
        disableTurnstile: environment.DISABLE_TURNSTILE,
        localTestAccountEmail: environment.LOCAL_TEST_ACCOUNT_EMAIL,
        port: environment.APP_PORT,
        natsUrl: createNatsServerUrl(
            environment.APP_NATS_HOST,
            environment.APP_NATS_PORT
        ),
        projectName: environment.APP_PROJECT_NAME,
        projectId: environment.APP_PROJECT_ID,
        corsOrigins: environment.APP_CORS_ORIGINS,
        activationOrigin: environment.APP_USER_ACTIVATION_ORIGIN,
        globalName: environment.APP_GLOBAL_NAME,
        host: environment.APP_HOST,
        sessionSignatureSecret: environment.APP_SESSION_SIGNATURE_SECRET,
        passwordPepper: environment.APP_PASSWORD_PEPPER,
        redisIdHmacSecret: environment.APP_REDIS_ID_HMAC_SECRET,
        AES_secret: environment.APP_AES_SECRET,
        version: environment.APP_VERSION,
        deviceIdSignatureSecret: environment.APP_DEVICE_ID_SIGNATURE_SECRET,
        supportEmail: environment.APP_SUPPORT_EMAIL,
        maxNatsPayloadBytes: environment.APP_MAX_NATS_PAYLOAD_BYTES,
        shutdownTimeoutMs: environment.APP_SHUTDOWN_TIMEOUT_MS
    }),

    [ConfigKey.Data]: (environment: ValidatedEnvironment) => ({
        pgSQL: {
            type: environment.SQL_DATABASE_TYPE,
            host: environment.SQL_DATABASE_HOST,
            port: environment.SQL_DATABASE_PORT,
            username: environment.SQL_DATABASE_USERNAME,
            password: environment.SQL_DATABASE_PASSWORD,
            database: environment.SQL_DATABASE,
            synchronize: environment.SQL_DATABASE_SYNCHRONIZE,
            logging: environment.SQL_DATABASE_LOGGING,
            logger: environment.SQL_DATABASE_LOGGER,
            autoLoadEntities: true,
            namingStrategy: new SnakeNamingStrategy()
        }
    }),

    [ConfigKey.Jwt]: (environment: ValidatedEnvironment) => ({
        accessToken: {
            expiresInMs: environment.JWT_EXPIRATION_ACCESS_TOKEN
        },
        ws_accessToken: {
            expiresInMs: environment.JWT_EXPIRATION_WS_ACCESS_TOKEN
        },
        preAuthorizationToken: {
            secret: environment.JWT_SECRETS_PRE_AUTHORIZATION_TOKEN,
            expiresInMs: environment.JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN
        },
        activationToken: {
            secret: environment.JWT_SECRETS_ACTIVATION_TOKEN,
            expiresInMs: environment.JWT_EXPIRATION_ACTIVATION_TOKEN
        },
        phoneNumberVerificationToken: {
            secret: environment.JWT_SECRETS_PHONE_NUMBER_VERIFICATION_TOKEN,
            expiresInMs: environment.JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN
        },
        emailVerificationToken: {
            secret: environment.JWT_SECRETS_EMAIL_VERIFICATION_TOKEN,
            expiresInMs: environment.JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN
        },
        emailOtpMfaActivationToken: {
            secret: environment.JWT_SECRETS_EMAIL_MFA_ACTIVATION,
            expiresInMs: environment.MFA_CHANGE_TIME
        },
        smsOtpMfaActivationToken: {
            secret: environment.JWT_SECRETS_SMS_MFA_ACTIVATION,
            expiresInMs: environment.MFA_CHANGE_TIME
        },
        appTotpMfaActivationToken: {
            secret: environment.JWT_SECRETS_APP_MFA_ACTIVATION,
            expiresInMs: environment.MFA_CHANGE_TIME
        },
        emailOtpMfaInactivationToken: {
            secret: environment.JWT_SECRETS_EMAIL_MFA_INACTIVATION,
            expiresInMs: environment.MFA_CHANGE_TIME
        },
        smsOtpMfaInactivationToken: {
            secret: environment.JWT_SECRETS_SMS_MFA_INACTIVATION,
            expiresInMs: environment.MFA_CHANGE_TIME
        },
        appTotpMfaInactivationToken: {
            secret: environment.JWT_SECRETS_APP_MFA_INACTIVATION,
            expiresInMs: environment.MFA_CHANGE_TIME
        },
        changePasswordToken: {
            secret: environment.JWT_SECRETS_CHANGE_PASSWORD,
            expiresInMs: environment.JWT_EXPIRATION_CHANGE_PASSWORD
        },
        accountRecoveryToken: {
            secret: environment.JWT_SECRETS_ACCOUNT_RECOVERY,
            expiresInMs: environment.JWT_EXPIRATION_ACCOUNT_RECOVERY
        },
        sso_preAuthorizationToken: {
            secret: environment.JWT_SECRETS_SSO_PRE_AUTHORIZATION_TOKEN,
            expiresInMs: environment.JWT_EXPIRATION_SSO_PRE_AUTHORIZATION_TOKEN
        },
        issuer: `${environment.APP_PROJECT_NAME}_${environment.APP_PROJECT_ID}`,
        audience: {
            access: environment.JWT_AUD_API,
            ws: environment.JWT_AUD_WS,
            auth: environment.JWT_AUD_AUTH
        }
    }),

    [ConfigKey.SecureCookie]: (environment: ValidatedEnvironment) => ({
        path: environment.SECURE_COOKIE_PATH,
        httpOnly: environment.SECURE_COOKIE_HTTP_ONLY,
        sameSite: environment.SECURE_COOKIE_SAME_SITE,
        secure: environment.SECURE_COOKIE_SECURE,
        domain: environment.SECURE_COOKIE_DOMAIN,
        secret: environment.SECURE_COOKIE_SECRET
    }),

    [ConfigKey.Email]: (environment: ValidatedEnvironment): MailerOptions => ({
        transport: {
            host: environment.EMAIL_SMTP_HOST,
            port: environment.EMAIL_SMTP_PORT,
            secure: environment.EMAIL_SMTP_SECURE,
            auth: {
                user: environment.EMAIL_USERNAME,
                pass: environment.EMAIL_PASSWORD
            }
        },
        defaults: {
            from: environment.EMAIL_DEFAULT_FROM
        },
        template: {
            dir: join(__dirname, './email/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
                strict: true
            }
        }
    }),

    [ConfigKey.Sms]: (environment: ValidatedEnvironment) => ({
        accountSID: environment.TWILIO_ACCOUNT_SID,
        authToken: environment.TWILIO_AUTH_TOKEN,
        number: environment.TWILIO_NUMBER,
        from: environment.TWILIO_FROM
    }),

    [ConfigKey.Totp]: (environment: ValidatedEnvironment) => ({
        bytes: environment.TOTP_CONFIG_BYTES,
        digits: environment.TOTP_CONFIG_DIGITS,
        period: environment.TOTP_CONFIG_PERIOD,
        totpPepper: environment.TOTP_CONFIG_PEPPER
    }),

    [ConfigKey.Session]: (environment: ValidatedEnvironment) => ({
        shortSessionLasting: environment.SHORT_SESSION_LASTING,
        persistentSessionLasting: environment.PERSISTENT_SESSION_LASTING,
        sessionZeroId: environment.SESSION_ZERO_ID
    }),

    [ConfigKey.Dropbox]: (environment: ValidatedEnvironment) => ({
        name: 'Dropbox',
        apiUrl: environment.DROPBOX_API_URL,
        appKey: environment.DROPBOX_APP_KEY,
        appSecret: environment.DROPBOX_APP_SECRET,
        redirectUri: environment.DROPBOX_REDIRECT_URI,
        tokenUrl: environment.DROPBOX_TOKEN_URL,
        authUrl: environment.DROPBOX_AUTH_URL
    }),

    [ConfigKey.Meilisearch]: (environment: ValidatedEnvironment) => ({
        host: environment.MEILISEARCH_HOST,
        masterKey: environment.MEILISEARCH_MASTER_KEY
    }),

    [ConfigKey.Cloudflare]: (environment: ValidatedEnvironment) => ({
        secretKey: environment.CLOUDFLARE_SECRET_KEY
    }),

    [ConfigKey.Redis]: (environment: ValidatedEnvironment) => ({
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
        password: environment.REDIS_PASSWORD
    }),

    [ConfigKey.SSO]: (environment: ValidatedEnvironment) => ({
        Google: {
            clientId: environment.GOOGLE_CLIENT_ID,
            clientSecret: environment.GOOGLE_CLIENT_SECRET,
            redirectUri: environment.GOOGLE_REDIRECT_URI
        },
        GitHub: {
            clientId: environment.GITHUB_CLIENT_ID,
            clientSecret: environment.GITHUB_CLIENT_SECRET,
            redirectUri: environment.GITHUB_REDIRECT_URI
        },
        LinkedIn: {
            clientId: environment.LINKEDIN_CLIENT_ID,
            clientSecret: environment.LINKEDIN_CLIENT_SECRET,
            redirectUri: environment.LINKEDIN_REDIRECT_URI
        },
        Discord: {
            clientId: environment.DISCORD_CLIENT_ID,
            clientSecret: environment.DISCORD_CLIENT_SECRET,
            redirectUri: environment.DISCORD_REDIRECT_URI
        }
    }),

    [ConfigKey.Feedback]: (environment: ValidatedEnvironment) => ({
        anonAuthorKey: environment.UM_FEEDBACK_ANON_AUTHOR_KEY
    })
} satisfies Record<ConfigKey, ConfigurationBuilder>

export type ConfigurationModel = {
    [Key in keyof typeof configurationBuilders]: ReturnType<(typeof configurationBuilders)[Key]>
}
