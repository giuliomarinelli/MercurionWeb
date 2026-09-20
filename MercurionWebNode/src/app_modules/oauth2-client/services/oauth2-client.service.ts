import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { OAuth2ProviderConfiguration } from 'src/config/config.types';
import { IOAuth2ClientService } from '../models/interfaces/i-oauth2-client-service.interface';
import { OAuth2PersistenceService } from './o-auth2-persistence.service';
import { UUID } from 'crypto';
import { OAuth2TokenData } from '../models/interfaces/oauth2-token-data.interface';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts';
import { ExternalHttpPort, ExternalHttpResponse } from 'src/infrastructure/external-http/external-http.port'
import { OAuthStateService } from './oauth-state.service'

@Injectable()
export class OAuth2ClientService implements IOAuth2ClientService {
    private readonly logger: LoggerContext;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly persistenceService: OAuth2PersistenceService,
        meiliLogger: LoggerPort,
        private readonly http: ExternalHttpPort,
        private readonly oauthStateService: OAuthStateService,
    ) {
        this.logger = meiliLogger.forContext(OAuth2ClientService.name)
    }

    private getProviderConfig(provider: string): OAuth2ProviderConfiguration {
        return this.configService.get<OAuth2ProviderConfiguration>(provider.toLowerCase()) as OAuth2ProviderConfiguration;
    }

    private normalizeProvider(provider: string): string {
        const normalized = provider.trim().toLowerCase()
        if (!normalized) throw new UnauthorizedException('OAuth provider is required')
        return normalized
    }

    private accessTokenTtl(expiresIn: number): ReturnType<typeof redisDurations.seconds> {
        if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
            throw new UnauthorizedException('Provider returned an invalid access-token expiry')
        }
        return redisDurations.seconds(Math.max(1, Math.floor(expiresIn)))
    }

    /**
     * Genera la URL di autorizzazione per il provider richiesto
     * (Dropbox: SEMPRE token_access_type=offline)
     */
    async getAuthorizationUrl(provider: string, userId?: string): Promise<string> {
        provider = this.normalizeProvider(provider)
        const config = this.getProviderConfig(provider)
        const state = await this.oauthStateService.create({
            provider,
            purpose: 'oauth2-connect',
            ownerUserId: userId,
        })

        // Parametri base
        const params: Record<string, string> = {
            client_id: config.appKey,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            ...(config.scopes ? { scope: config.scopes.join(' ') } : {}),
            state,
        };

        // PATCH: Dropbox richiede token_access_type=offline per refresh_token
        if (provider.toLowerCase() === 'dropbox') {
            params['token_access_type'] = 'offline'
        }

        return `${config.authUrl}?${new URLSearchParams(params).toString()}`
    }

    /**
     * Gestisce il callback OAuth2, scambia code per access/refresh token e salva tutto
     */
    async handleCallback(provider: string, code: string, userId?: UUID): Promise<void> {
        provider = this.normalizeProvider(provider)
        const config = this.getProviderConfig(provider)

        // Token Exchange
        let tokenRes: ExternalHttpResponse<Record<string, unknown>>
        try {
            tokenRes = await this.http.post<Record<string, unknown>>(
                config.tokenUrl,
                new URLSearchParams({
                    code,
                    grant_type: 'authorization_code',
                    client_id: config.appKey,
                    client_secret: config.appSecret,
                    redirect_uri: config.redirectUri,
                }),
                { timeoutMs: 10_000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
        } catch {
            this.logger.error(`OAuth token exchange failed for provider ${provider}`)
            throw new UnauthorizedException('Failed to exchange code for tokens')
        }

        const { access_token, refresh_token, expires_in } = tokenRes.data as unknown as OAuth2TokenData
        if (!access_token) {
            throw new UnauthorizedException('No access_token received from provider.')
        }
        if (!refresh_token) {
            this.logger.error('No refresh_token received. Verifica token_access_type=offline e revoca i permessi su Dropbox.')
            throw new UnauthorizedException('No refresh_token received from provider.')
        }

        // Persistenza
        await this.persistenceService.saveRefreshToken(provider, refresh_token, userId)
        await this.redisService.set(
            redisKeys.oauth.accessToken(provider, userId),
            access_token,
            this.accessTokenTtl(expires_in)
        )
    }

    /**
     * Recupera sempre un access token valido, fa refresh automatico se serve
     */
    async getAccessToken(provider: string, userId?: UUID): Promise<string> {
        provider = this.normalizeProvider(provider)
        const redisKey = redisKeys.oauth.accessToken(provider, userId)
        let accessToken = await this.redisService.get(redisKey)

        if (!accessToken) {
            const refreshToken = await this.persistenceService.getRefreshToken(provider, userId)
            if (!refreshToken) throw new UnauthorizedException('Refresh token not found, user must re-authenticate.')

            const config = this.getProviderConfig(provider)
            let tokenRes;
            try {
                tokenRes = await this.http.post<Record<string, unknown>>(
                    config.tokenUrl,
                    new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken,
                        client_id: config.appKey,
                        client_secret: config.appSecret,
                    }),
                    { timeoutMs: 10_000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
            } catch {
                this.logger.error(`OAuth token refresh failed for provider ${provider}`)
                throw new UnauthorizedException('Failed to refresh access token')
            }

            const { access_token, expires_in, new_refresh_token, refresh_token } = tokenRes.data as unknown as OAuth2TokenData
            if (!access_token) throw new UnauthorizedException('No access_token received during refresh.')

            const rotatedRefreshToken = new_refresh_token ?? refresh_token
            if (rotatedRefreshToken) {
                await this.persistenceService.saveRefreshToken(provider, rotatedRefreshToken, userId)
            }

            await this.redisService.set(
                redisKey,
                access_token,
                this.accessTokenTtl(expires_in)
            )

            accessToken = access_token
        }
        return accessToken
    }

    async disconnect(provider: string, userId?: UUID): Promise<void> {
        provider = this.normalizeProvider(provider)
        const accessTokenKey = redisKeys.oauth.accessToken(provider, userId)
        const accessToken = await this.redisService.get(accessTokenKey)
        const config = this.getProviderConfig(provider)

        try {
            if (accessToken && config.revocationUrl) {
                await this.http.post(
                    config.revocationUrl,
                    undefined,
                    {
                        timeoutMs: 10_000,
                        headers: config.revocationAuth === 'bearer'
                            ? { Authorization: `Bearer ${accessToken}` }
                            : { 'Content-Type': 'application/x-www-form-urlencoded' },
                    },
                )
            }
        } catch {
            this.logger.warn(`OAuth provider revocation failed for provider ${provider}`)
        } finally {
            await this.redisService.del(accessTokenKey)
            await this.persistenceService.deleteCredentials(provider, userId)
        }
    }
}
