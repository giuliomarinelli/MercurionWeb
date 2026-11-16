import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createLocalJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port'
import { LoggerContext, LoggerPort } from 'src/logging/logger.port'
import { SSO_Configurations } from 'src/config/config.types'

import { AuthProvider } from '../models/enums/auth-provider.enum'
import { ISocialProviderClient } from '../models/interfaces/i-social-provider-client.interface'
import { ProviderProfile } from '../models/interfaces/provider-profile.interface'

interface OrcidDiscovery {
    issuer: string
    authorization_endpoint: string
    token_endpoint: string
    userinfo_endpoint: string
    jwks_uri: string
}

interface OrcidTokenResponse {
    access_token?: string
    id_token?: string
}

interface OrcidUserInfo {
    sub?: string
    given_name?: string
    family_name?: string
    name?: string
}

type OrcidClaims = JWTPayload & {
    given_name?: string
    family_name?: string
    name?: string
}

/**
 * ORCID OpenID Connect provider.
 *
 * ORCID authenticates the external identity only. Mercurion consumes the
 * resulting ProviderProfile and remains authoritative for application
 * sessions, token issuance, refresh and revocation.
 */
@Injectable()
export class OrcidProviderClient implements ISocialProviderClient {

    private readonly logger: LoggerContext
    private readonly clientId: string
    private readonly clientSecret: string
    private readonly redirectUri: string
    private readonly issuer: string
    private readonly discoveryUrl: string

    private cachedDiscovery: OrcidDiscovery | null = null
    private jwks: ReturnType<typeof createLocalJWKSet> | null = null

    constructor(
        private readonly configService: ConfigService,
        loggerFactory: LoggerPort,
        private readonly http: ExternalHttpPort,
    ) {
        const { clientId, clientSecret, redirectUri, issuer } =
            this.configService.get<SSO_Configurations['ORCID']>('SSO.ORCID')!

        this.clientId = clientId
        this.clientSecret = clientSecret
        this.redirectUri = redirectUri
        this.issuer = issuer.replace(/\/+$/, '')
        this.discoveryUrl = `${this.issuer}/.well-known/openid-configuration`
        this.logger = loggerFactory.forContext(OrcidProviderClient.name)
    }

    getAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid',
            state,
        })

        return `${this.issuer}/oauth/authorize?${params.toString()}`
    }

    async getProfileFromCode(code: string): Promise<ProviderProfile> {
        const discovery = await this.getDiscovery()

        const tokenRes = await this.http.post<OrcidTokenResponse>(
            discovery.token_endpoint,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
            }),
            {
                timeoutMs: 10_000,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        )

        const accessToken = tokenRes.data.access_token
        if (!accessToken) {
            throw applicationError(ApplicationErrorCode.SSO_ORCID_ACCESS_TOKEN_MISSING)
        }

        const idToken = tokenRes.data.id_token
        if (!idToken) {
            throw applicationError(ApplicationErrorCode.SSO_ORCID_ID_TOKEN_MISSING)
        }

        const claims = await this.verifyIdToken(idToken, discovery.jwks_uri)
        const subject = this.nonEmptyString(claims.sub)
        if (!subject) {
            throw applicationError(ApplicationErrorCode.SSO_ORCID_ID_TOKEN_INVALID)
        }

        const userInfoRes = await this.http.get<OrcidUserInfo>(
            discovery.userinfo_endpoint,
            {
                timeoutMs: 10_000,
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        )
        const userInfo = userInfoRes.data

        if (userInfo.sub && userInfo.sub !== subject) {
            throw applicationError(ApplicationErrorCode.SSO_ORCID_USERINFO_INVALID)
        }

        const givenName =
            this.nonEmptyString(userInfo.given_name) ??
            this.nonEmptyString(claims.given_name)
        const familyName =
            this.nonEmptyString(userInfo.family_name) ??
            this.nonEmptyString(claims.family_name)
        const displayName =
            this.nonEmptyString(userInfo.name) ??
            this.nonEmptyString(claims.name) ??
            ''

        const [fallbackFirstName = '', ...fallbackLastNameParts] =
            displayName.split(/\s+/).filter(Boolean)

        return {
            provider: AuthProvider.ORCID,
            subject,
            // ORCID Basic OIDC does not advertise email/email_verified claims.
            // Keep the existing nullable-email ProviderProfile contract.
            email: null,
            emailVerified: false,
            firstName: givenName ?? fallbackFirstName,
            lastName: familyName ?? fallbackLastNameParts.join(' '),
        }
    }

    private async getDiscovery(): Promise<OrcidDiscovery> {
        if (this.cachedDiscovery) {
            return this.cachedDiscovery
        }

        const res = await this.http.get<OrcidDiscovery>(
            this.discoveryUrl,
            { timeoutMs: 10_000 },
        )
        const discovery = res.data

        if (
            discovery.issuer !== this.issuer ||
            !this.nonEmptyString(discovery.authorization_endpoint) ||
            !this.nonEmptyString(discovery.token_endpoint) ||
            !this.nonEmptyString(discovery.userinfo_endpoint) ||
            !this.nonEmptyString(discovery.jwks_uri)
        ) {
            throw applicationError(ApplicationErrorCode.SSO_ORCID_USERINFO_INVALID)
        }

        this.cachedDiscovery = discovery
        return discovery
    }

    private async verifyIdToken(idToken: string, jwksUri: string): Promise<OrcidClaims> {
        try {
            if (!this.jwks) {
                const response = await this.http.get<{
                    keys: Record<string, unknown>[]
                }>(jwksUri, { timeoutMs: 10_000 })
                this.jwks = createLocalJWKSet(
                    response.data as Parameters<typeof createLocalJWKSet>[0],
                )
            }

            const { payload } = await jwtVerify(idToken, this.jwks, {
                algorithms: ['RS256'],
                issuer: this.issuer,
                audience: this.clientId,
            })

            return payload as OrcidClaims
        } catch (error) {
            this.logger.warn(
                'verifyIdToken > error',
                (error instanceof Error ? error.stack : error) as object,
            )
            throw applicationError(ApplicationErrorCode.SSO_ORCID_ID_TOKEN_INVALID)
        }
    }

    private nonEmptyString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim().length > 0
            ? value.trim()
            : undefined
    }
}
