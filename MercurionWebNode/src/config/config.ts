

import { registerAs } from "@nestjs/config";
import { AppConfiguration, CloudflareConfiguration, DataConfiguration, OAuth2ProviderConfiguration, JwtConfigurations, MeilisearchConfiguration, SecureCookieConfiguration, SessionConfiguration, SmsConfiguration, TotpConfiguration } from "./@types-config";
import { UUID } from "crypto";
import { GeneralUtils } from "src/utils/general-utils/general-utils";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { MailerOptions } from "@nestjs-modules/mailer";
import { join } from "path";
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'

export enum Environment {

    Development = 'development',
    Staging = 'staging',
    Production = 'production',
    Testing = 'testing',

}

export enum ConfigKey {

    App = 'App',
    Data = 'Data',
    Jwt = "Jwt",
    SecureCookie = 'SecureCookie',
    Email = "Email",
    Sms = "Sms",
    Totp = "Totp",
    Session = "Session",
    Dropbox = "Dropbox",
    Meilisearch = 'Meilisearch',
    Cloudflare = 'Cloudflare'

}

const AppConfig = registerAs(

    ConfigKey.App, (): AppConfiguration => ({
        env: GeneralUtils.getEnumValue(Environment, process.env.NODE_ENV ?? Environment.Development) as Environment,
        port: Number(process.env.APP_PORT) || 8099,
        natsPort: Number(process.env.APP_NATS_PORT) || 4223,
        natsHost: process.env.APP_NATS_HOST ?? 'nats://localhost',
        projectName: process.env.APP_PROJECT_NAME ?? '',
        projectId: process.env.APP_PROJECT_ID as UUID ?? '',
        corsOrigins: JSON.parse(process.env.APP_CORS_ORIGINS ?? `[]`) as string[],
        activationOrigin: process.env.APP_USER_ACTIVATION_ORIGIN ?? '',
        globalName: process.env.APP_GLOBAL_NAME ?? '',
        host: process.env.APP_HOST ?? 'http://localhost'
    })
)

const DataConfig = registerAs(
    ConfigKey.Data, (): DataConfiguration => ({
        sqlDB: {
            type: process.env.SQL_DATABASE_TYPE as 'mariadb' | 'postgres',
            host: process.env.SQL_DATABASE_HOST,
            port: Number(process.env.SQL_DATABASE_PORT),
            username: process.env.SQL_DATABASE_USERNAME,
            password: process.env.SQL_DATABASE_PASSWORD,
            database: process.env.SQL_DATABASE,
            synchronize: JSON.parse(process.env.SQL_DATABASE_SYNCHRONIZE ?? 'false') as boolean,
            logging: JSON.parse(process.env.SQL_DATABASE_LOGGING ?? 'false') as boolean,
            logger: process.env.SQL_DATABASE_LOGGER as 'debug' | 'file' | 'simple-console' | 'advanced-console',
            autoLoadEntities: true,
            namingStrategy: new SnakeNamingStrategy(),
        },
        chemblDB: {
            type: process.env.CHEMBL_DATABASE_TYPE as 'mariadb' | 'postgres',
            host: process.env.CHEMBL_DATABASE_HOST,
            port: Number(process.env.CHEMBL_DATABASE_PORT),
            username: process.env.CHEMBL_DATABASE_USERNAME,
            password: process.env.CHEMBL_DATABASE_PASSWORD,
            database: process.env.CHEMBL_DATABASE,
            synchronize: JSON.parse(process.env.CHEMBL_DATABASE_SYNCHRONIZE ?? 'false') as boolean,
            logging: JSON.parse(process.env.CHEMBL_DATABASE_LOGGING ?? 'false') as boolean,
            logger: process.env.CHEMBL_DATABASE_LOGGER as 'debug' | 'file' | 'simple-console' | 'advanced-console',
            autoLoadEntities: true,
            namingStrategy: new SnakeNamingStrategy()
        }
    })
)

const JwtConfig = registerAs(
    ConfigKey.Jwt, (): JwtConfigurations => ({
        accessToken: {
            expiresInMs: Number(process.env.JWT_EXPIRATION_ACCESS_TOKEN)
        },
        ws_accessToken: {
            expiresInMs: Number(process.env.JWT_EXPIRATION_WS_ACCESS_TOKEN)
        },
        preAuthorizationToken: {
            secret: process.env.JWT_SECRETS_PRE_AUTHORIZATION_TOKEN,
            expiresInMs: Number(process.env.JWT_EXPIRATION_PRE_AUTHORIZATION_TOKEN)
        },
        activationToken: {
            secret: process.env.JWT_SECRETS_ACTIVATION_TOKEN,
            expiresInMs: Number(process.env.JWT_EXPIRATION_ACTIVATION_TOKEN)
        },
        phoneNumberVerificationToken: {
            secret: process.env.JWT_SECRETS_PHONE_NUMBER_VERIFICATION_TOKEN,
            expiresInMs: Number(process.env.JWT_EXPIRATION_PHONE_NUMBER_VERIFICATION_TOKEN)
        },
        emailVerificationToken: {
            secret: process.env.JWT_SECRETS_EMAIL_VERIFICATION_TOKEN,
            expiresInMs: Number(process.env.JWT_EXPIRATION_EMAIL_VERIFICATION_TOKEN)
        },
        emailOtpMfaActivationToken: {
            secret: process.env.JWT_SECRETS_EMAIL_MFA_ACTIVATION,
            expiresInMs: Number(process.env.MFA_CHANGE_TIME)
        },
        smsOtpMfaActivationToken: {
            secret: process.env.JWT_SECRETS_SMS_MFA_ACTIVATION,
            expiresInMs: Number(process.env.MFA_CHANGE_TIME)
        },
        appTotpMfaActivationToken: {
            secret: process.env.JWT_SECRETS_APP_MFA_ACTIVATION,
            expiresInMs: Number(process.env.MFA_CHANGE_TIME)
        },
        emailOtpMfaInactivationToken: {
            secret: process.env.JWT_SECRETS_EMAIL_MFA_INACTIVATION,
            expiresInMs: Number(process.env.MFA_CHANGE_TIME)
        },
        smsOtpMfaInactivationToken: {
            secret: process.env.JWT_SECRETS_SMS_MFA_INACTIVATION,
            expiresInMs: Number(process.env.MFA_CHANGE_TIME)
        },
        appTotpMfaInactivationToken: {
            secret: process.env.JWT_SECRETS_APP_MFA_INACTIVATION,
            expiresInMs: Number(process.env.MFA_CHANGE_TIME)
        },
        changePasswordToken: {
            secret: process.env.JWT_SECRETS_CHANGE_PASSWORD,
            expiresInMs: Number(process.env.JWT_EXPIRATION_CHANGE_PASSWORD)
        },
        issuer: process.env.APP_PROJECT_NAME + `_${process.env.APP_PROJECT_ID as UUID ?? ''}`
    })
)

const SecureCookieConfig = registerAs(
    ConfigKey.SecureCookie, (): SecureCookieConfiguration => ({
        path: process.env.SECURE_COOKIE_PATH ?? '/',
        httpOnly: JSON.parse(process.env.SECURE_COOKIE_HTTP_ONLY ?? 'false') as boolean,
        sameSite: (process.env.SECURE_COOKIE_SAME_SITE as "lax" | "strict" | "none") ?? "lax",
        secure: JSON.parse(process.env.SECURE_COOKIE_SECURE ?? 'false') as boolean,
        domain: process.env.SECURE_COOKIE_DOMAIN ?? 'localhost',
        secret: process.env.SECURE_COOKIE_SECRET ?? ''
    })
)

const EmailConfig = registerAs(
    ConfigKey.Email, (): MailerOptions => ({
        transport: {
            host: process.env.EMAIL_SMTP_HOST,
            port: Number(process.env.EMAIL_SMTP_PORT),
            secure: JSON.parse(process.env.EMAIL_SMTP_SECURE ?? 'true') as boolean,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        },
        defaults: {
            from: process.env.EMAIL_DEFAULT_FROM,
        },
        template: {
            dir: join(__dirname, './email/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
                strict: true,
            },
        }

    })
)

const SmsConfig = registerAs(
    ConfigKey.Sms, (): SmsConfiguration => ({
        accountSID: process.env.TWILIO_ACCOUNT_SID ?? '',
        authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
        number: process.env.TWILIO_NUMBER ?? '',
        from: process.env.TWILIO_FROM ?? ''
    })
)

const TotpConfig = registerAs(
    ConfigKey.Totp, (): TotpConfiguration => ({

        bytes: Number(process.env.TOTP_CONFIG_BYTES),
        digits: Number(process.env.TOTP_CONFIG_DIGITS),
        period: Number(process.env.TOTP_CONFIG_PERIOD)

    })
)

const SessionConfig = registerAs(

    ConfigKey.Session, (): SessionConfiguration => ({
        shortSessionLasting: Number(process.env.SHORT_SESSION_LASTING),
        persistentSessionLasting: Number(process.env.PERSISTENT_SESSION_LASTING),
        sessionZeroId: process.env.SESSION_ZERO_ID as UUID
    })

)

const DropboxConfig = registerAs(

    ConfigKey.Dropbox, (): OAuth2ProviderConfiguration => ({
        name: "Dropbox",
        apiUrl: process.env.DROPBOX_API_URL ?? '',
        appKey: process.env.DROPBOX_APP_KEY ?? '',
        appSecret: process.env.DROPBOX_APP_SECRET ?? '',
        redirectUri: process.env.DROPBOX_REDIRECT_URI ?? '',
        tokenUrl: process.env.DROPBOX_TOKEN_URL ?? '',
        authUrl: process.env.DROPBOX_AUTH_URL!
    })

)

const MeilisearchConfig = registerAs(
    ConfigKey.Meilisearch, (): MeilisearchConfiguration => ({
        host: process.env.MEILISEARCH_HOST as string,
        masterKey: process.env.MEILISEARCH_MASTER_KEY as string
    })
)

const CloudflareConfig = registerAs(
    ConfigKey.Cloudflare, (): CloudflareConfiguration => ({
        secretKey: process.env.CLOUDFLARE_SECRET_KEY as string
    })
)


export const configurations = [
    AppConfig,
    DataConfig,
    EmailConfig,
    JwtConfig,
    SecureCookieConfig,
    SmsConfig,
    TotpConfig,
    SessionConfig,
    DropboxConfig,
    MeilisearchConfig,
    CloudflareConfig
]