import { Injectable } from '@nestjs/common';
import { OAuth2ClientService } from './oauth2-client.service';
import { UUID } from 'crypto';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';

@Injectable()
export class OAuth2AccessTokenRefreshService {

    private readonly logger: LoggerContext

    constructor(
        private readonly oauth2ClientService: OAuth2ClientService,
        meiliLogger: LoggerPort
    ) {
        this.logger = meiliLogger.forContext(OAuth2AccessTokenRefreshService.name)
    }

    /**
     * Forza il rinnovo dell'access token di uno user per uno specifico provider.
     * Usato da PubSubService e richiamabile ovunque serva.
     */
    async refreshAccessToken(provider: string, userId?: UUID): Promise<string> {
        this.logger.log(`Attempting refresh for provider=${provider} userId=${userId ?? '[none]'}`)
        // Qui puoi estendere per logica custom se un provider ha flussi diversi

        // Chiama la getAccessToken: se il token è scaduto, viene rinnovato col refresh_token
        return await this.oauth2ClientService.getAccessToken(provider, userId)
    }
}
