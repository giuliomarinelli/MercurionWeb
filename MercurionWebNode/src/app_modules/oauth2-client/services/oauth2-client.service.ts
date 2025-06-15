import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { OAuth2ProviderConfiguration } from 'src/config/@types-config';
import { IOAuth2ClientService } from '../Models/interfaces/i-oauth2-client-service.interface';
import { OAuth2PersistenceService } from './o-auth2-persistence.service';
import { UUID } from 'crypto';
import { OAuth2TokenData } from '../Models/interfaces/oauth2-token-data.interface';


@Injectable()
export class OAuth2ClientService implements IOAuth2ClientService {

    private readonly logger = new Logger(OAuth2ClientService.name)

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly persistenceService: OAuth2PersistenceService,
    ) { }

    refreshAccessToken(provider: string, userId?: string): Promise<string> {
        throw new Error('Method not implemented.')
    }

    private getProviderConfig(provider: string): OAuth2ProviderConfiguration {
        return this.configService.get<OAuth2ProviderConfiguration>(provider) as OAuth2ProviderConfiguration
    }

    /**
     * Genera la URL di autorizzazione per il provider richiesto
     */
    getAuthorizationUrl(provider: string, userId?: string): string {
        const config = this.getProviderConfig(provider);

        const params = new URLSearchParams({
            client_id: config.appKey,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            ...(config.scopes ? { scope: config.scopes.join(' ') } : {}),
            state: userId || '', // opzionale, per CSRF/multiutente
            // ...altri parametri custom per provider diversi
        })

        return `${config.authUrl}?${params.toString()}`;
    }

    /**
     * Gestisce il callback OAuth2, scambia code per access/refresh token e salva tutto
     */
    async handleCallback(provider: string, code: string, userId?: UUID): Promise<void> {
        const config = this.getProviderConfig(provider);

        // POST token exchange
        const tokenRes = await axios.post(
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

        const { access_token, refresh_token, expires_in } = tokenRes.data as OAuth2TokenData
        if (!refresh_token) throw new UnauthorizedException('No refresh_token received from provider.');

        // Salva refresh token su MariaDB
        // Salva refresh token su MariaDB
        await this.persistenceService.saveRefreshToken(provider, refresh_token, userId)

        // Salva access token su Redis con TTL
        await this.redisService.set(`access_token:${provider}${userId ? `:${userId}` : ''}`, access_token ?? '', expires_in)
    }

    /**
     * Recupera sempre un access token valido, fa refresh automatico se serve
     */
    async getAccessToken(provider: string, userId?: UUID): Promise<string> {
        const redisKey = `access_token:${provider}${userId ? `:${userId}` : ''}`
        let accessToken = await this.redisService.get(redisKey)

        if (!accessToken) {
            // Recupera refresh token da MariaDB
            const refreshToken = await this.persistenceService.getRefreshToken(provider, userId as UUID)
            if (!refreshToken) throw new UnauthorizedException('Refresh token not found, user must re-authenticate.')

            // Chiama il provider per il refresh
            const config = this.getProviderConfig(provider)

            const tokenRes = await axios.post(
                config.tokenUrl,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: config.appKey,
                    client_secret: config.appSecret,
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            )

            const { access_token, expires_in, new_refresh_token } = tokenRes.data as OAuth2TokenData
            if (!access_token) throw new UnauthorizedException('No access_token received during refresh.')

            // Salva nuovo access token su Redis
            await this.redisService.set(redisKey, access_token, expires_in)

            // Se viene restituito un nuovo refresh token, aggiorna MariaDB
            if (new_refresh_token) {
                await this.persistenceService.saveRefreshToken(provider, new_refresh_token, userId)
            }

            accessToken = access_token;
        }
        return accessToken;
    }
}
