import { errorMessage, errorStack } from 'src/utils/errors/error-message'
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { ISocialProviderClient } from '../models/interfaces/i-social-provider-client.interface';
import { ProviderProfile } from '../models/interfaces/provider-profile.interface';
import { AuthProvider } from '../models/enums/auth-provider.enum';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';

import { SSO_Configuration } from 'src/config/config.types';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port'

/**
 * Google OIDC:
 * - auth endpoint: https://accounts.google.com/o/oauth2/v2/auth
 * - token endpoint: https://oauth2.googleapis.com/token
 * - discovery: https://accounts.google.com/.well-known/openid-configuration
 */
@Injectable()
export class GoogleProviderClient implements ISocialProviderClient {

    private readonly logger: LoggerContext

    private readonly clientId: string
    private readonly clientSecret: string
    private readonly redirectUri: string

    private readonly issuer = 'https://accounts.google.com'
    private readonly discoveryUrl = 'https://accounts.google.com/.well-known/openid-configuration'

    private jwks: ReturnType<typeof createLocalJWKSet> | null = null
    private cachedDiscovery: unknown = null

    constructor(
        private readonly configService: ConfigService,
        loggerFactory: LoggerPort,
        private readonly http: ExternalHttpPort,
    ) {
        const { clientId, clientSecret, redirectUri } = this.configService.get<SSO_Configuration>('SSO.Google')!
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.redirectUri = redirectUri
        this.logger = loggerFactory.forContext(GoogleProviderClient.name)
    }

    getAuthorizationUrl(state: string, nonce?: string): string {

        // endpoint stabile indicato da Google OIDC :contentReference[oaicite:0]{index=0}
        const authEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

        const params: Record<string, string> = {
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'openid email profile', // OIDC scopes standard :contentReference[oaicite:1]{index=1}
            state,
            access_type: 'offline',
            prompt: 'consent'
        }

        if (nonce) {
            params['nonce'] = nonce
        }

        return `${authEndpoint}?${new URLSearchParams(params).toString()}`
    }

    async getProfileFromCode(code: string): Promise<ProviderProfile> {

        const discovery = await this.getDiscovery()

        // Token exchange <==> OAuth2 Flow
        const tokenRes = await this.http.post<Record<string, string>>(
            (discovery as Record<string, string>).token_endpoint,
            new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
            }),
            { timeoutMs: 10_000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        )

        const { id_token } = (tokenRes as unknown as Record<string, string>).data as unknown as Record<string, string>
        if (!id_token) throw applicationError(ApplicationErrorCode.SSO_GOOGLE_ID_TOKEN_MISSING)

        const claims = await this.verifyIdToken(id_token, (discovery as Record<string, string>).jwks_uri) as Record<string, string | undefined>

        const name = (claims.name) ?? ''
        const [firstName, ...rest] = name.split(' ').filter(Boolean)
        const lastName = rest.join(' ') || undefined

        return {
            provider: AuthProvider.Google,
            subject: claims.sub as string,
            email: claims.email ?? null,
            emailVerified: Boolean(claims.email_verified),
            firstName,
            lastName,
            avatarUrl: claims.picture
        }
    }

    private async getDiscovery(): Promise<unknown> {
        if (this.cachedDiscovery) {
            return this.cachedDiscovery
        }
        // Discovery OIDC standard :contentReference[oaicite:2]{index=2}
        const res = await this.http.get<Record<string, string>>(this.discoveryUrl, { timeoutMs: 10_000 })
        this.cachedDiscovery = res.data
        return res.data
    }

    private async verifyIdToken(idToken: string, jwksUri: string): Promise<unknown> {
        try {
            if (!this.jwks) {
                const response = await this.http.get<{
                    keys: Record<string, unknown>[]
                }>(jwksUri, { timeoutMs: 10_000 })
                this.jwks = createLocalJWKSet(response.data as Parameters<typeof createLocalJWKSet>[0])
            }
            const { payload } = await jwtVerify(idToken, this.jwks, {
                issuer: this.issuer,           // Google issuer :contentReference[oaicite:3]{index=3}
                audience: this.clientId
            })
            return payload
        } catch (e) {
            this.logger.warn('verifyIdToken > error: ', errorStack(e) ?? errorMessage(e))
            throw applicationError(ApplicationErrorCode.SSO_GOOGLE_ID_TOKEN_INVALID)
        }
    }
}
