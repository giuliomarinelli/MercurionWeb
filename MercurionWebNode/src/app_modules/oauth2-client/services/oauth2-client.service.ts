import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { OAuth2ProviderConfiguration } from 'src/config/@types-config';
import { IOAuth2ClientService } from '../Models/interfaces/i-oauth2-client-service.interface';
import { OAuth2PersistenceService } from './o-auth2-persistence.service';
import { UUID } from 'crypto';
import { OAuth2TokenData } from '../Models/interfaces/oauth2-token-data.interface';

@Injectable()
export class OAuth2ClientService implements IOAuth2ClientService {
    private readonly logger = new Logger(OAuth2ClientService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly persistenceService: OAuth2PersistenceService,
    ) { }

    private getProviderConfig(provider: string): OAuth2ProviderConfiguration {
        return this.configService.get<OAuth2ProviderConfiguration>(provider) as OAuth2ProviderConfiguration;
    }

    /**
     * Genera la URL di autorizzazione per il provider richiesto
     * (Dropbox: SEMPRE token_access_type=offline)
     */
    getAuthorizationUrl(provider: string, userId?: string): string {
        const config = this.getProviderConfig(provider)

        // Parametri base
        const params: Record<string, string> = {
            client_id: config.appKey,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            ...(config.scopes ? { scope: config.scopes.join(' ') } : {}),
            state: userId || '',
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
        const config = this.getProviderConfig(provider)

        // Token Exchange
        let tokenRes: AxiosResponse<any, any>
        try {
            tokenRes = await axios.post(
                config.tokenUrl,
                new URLSearchParams({
                    code,
                    grant_type: 'authorization_code',
                    client_id: config.appKey,
                    client_secret: config.appSecret,
                    redirect_uri: config.redirectUri,
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
        } catch (err) {
            this.logger.error(`Token exchange error: ${err?.response?.data || err.message}`)
            throw new UnauthorizedException('Failed to exchange code for tokens')
        }

        const { access_token, refresh_token, expires_in } = tokenRes.data as OAuth2TokenData
        if (!refresh_token) {
            this.logger.error('No refresh_token received. Verifica token_access_type=offline e revoca i permessi su Dropbox.')
            throw new UnauthorizedException('No refresh_token received from provider.')
        }

        // Persistenza
        await this.persistenceService.saveRefreshToken(provider, refresh_token, userId)
        await this.redisService.set(`access_token:${provider}${userId ? `:${userId}` : ''}`, access_token ?? '', expires_in)
    }

    /**
     * Recupera sempre un access token valido, fa refresh automatico se serve
     */
    async getAccessToken(provider: string, userId?: UUID): Promise<string> {
        const redisKey = `access_token:${provider}${userId ? `:${userId}` : ''}`
        let accessToken = await this.redisService.get(redisKey)

        if (!accessToken) {
            const refreshToken = await this.persistenceService.getRefreshToken(provider, userId as UUID)
            if (!refreshToken) throw new UnauthorizedException('Refresh token not found, user must re-authenticate.')

            const config = this.getProviderConfig(provider)
            let tokenRes;
            try {
                tokenRes = await axios.post(
                    config.tokenUrl,
                    new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken,
                        client_id: config.appKey,
                        client_secret: config.appSecret,
                    }),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
            } catch (err) {
                this.logger.error(`Token refresh error: ${err?.response?.data || err.message}`)
                throw new UnauthorizedException('Failed to refresh access token')
            }

            const { access_token, expires_in, new_refresh_token } = tokenRes.data as OAuth2TokenData
            if (!access_token) throw new UnauthorizedException('No access_token received during refresh.')

            await this.redisService.set(redisKey, access_token, expires_in)

            if (new_refresh_token) {
                await this.persistenceService.saveRefreshToken(provider, new_refresh_token, userId)
            }

            accessToken = access_token
        }
        return accessToken
    }
}
