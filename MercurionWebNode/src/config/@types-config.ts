import { TypeOrmModuleOptions } from "@nestjs/typeorm"
import { UUID } from "crypto"
import { Environment } from "./config"

export interface AppConfiguration {

    env: Environment
    port: number
    natsPort: number
    natsHost: string
    projectName: string
    projectId: UUID
    corsOrigins: string[]
    activationOrigin: string
    globalName: string
    host: string

}

export interface DataConfiguration {

    sqlDB: TypeOrmModuleOptions,
    chemblDB: TypeOrmModuleOptions

}

export interface JwtConfiguration {

    secret?: string
    expiresInMs: number

}

export interface JwtConfigurations {

    accessToken: JwtConfiguration
    ws_accessToken: JwtConfiguration
    preAuthorizationToken: JwtConfiguration
    activationToken: JwtConfiguration
    phoneNumberVerificationToken: JwtConfiguration
    emailVerificationToken: JwtConfiguration
    emailOtpMfaActivationToken: JwtConfiguration
    smsOtpMfaActivationToken: JwtConfiguration
    appTotpMfaActivationToken: JwtConfiguration
    emailOtpMfaInactivationToken: JwtConfiguration
    smsOtpMfaInactivationToken: JwtConfiguration
    appTotpMfaInactivationToken: JwtConfiguration
    issuer: string

}

export interface SmsConfiguration {

    accountSID: string
    authToken: string
    number: string
    from: string

}

export interface SecureCookieConfiguration {

    path: string
    httpOnly: boolean
    sameSite: "strict" | "lax" | "none"
    secure: boolean
    domain: string
    secret: string

}

export type CookieConfiguration = Omit<SecureCookieConfiguration, "secret">

export interface TotpConfiguration {

    bytes: number
    digits: number
    period: number

}

export interface SessionConfiguration {

    shortSessionLasting: number
    persistentSessionLasting: number
    sessionZeroId: UUID

}

export interface OAuth2ProviderConfiguration {
    name: string
    apiUrl: string
    appKey: string
    appSecret: string
    redirectUri: string
    tokenUrl: string
    authUrl: string
    scopes?: string[]
}

export interface MeilisearchConfiguration {
    host: string
    masterKey: string
}

export interface CloudFlareConfiguration {
    secretKey: string
}
