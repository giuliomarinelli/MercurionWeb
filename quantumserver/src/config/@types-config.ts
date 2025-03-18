import { TypeOrmModuleOptions } from "@nestjs/typeorm"
import { UUID } from "crypto"
import { Environment } from "./config"

export interface AppConfiguration {
    
    env: Environment
    port: number
    natsPort: number
    projectName: string
    projectId: UUID
    corsOrigins: string[]
    activationOrigin: string
    globalName: string

}

export interface DataConfiguration {

    sqlDB: TypeOrmModuleOptions
    
}

export interface JwtConfiguration {

    secret?: string
    expiresInMs: number

}

export interface JwtConfigurations {

    accessToken: JwtConfiguration
    refreshToken: JwtConfiguration
    preAuthorizationToken: JwtConfiguration
    activationToken: JwtConfiguration
    phoneNumberVerificationToken: JwtConfiguration
    emailVerificationToken: JwtConfiguration
    e_v_t: JwtConfiguration
    p_v_t: JwtConfiguration
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

}

export interface DropboxConfiguration {
    
    apiUrl: string
    appKey: string
    appSecret: string
    redirectUri: string
    tokenUrl: string

}
