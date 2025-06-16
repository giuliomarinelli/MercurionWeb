import { Injectable, Logger } from '@nestjs/common';
import { OAuth2ClientService } from './oauth2-client.service';
import { UUID } from 'crypto';

@Injectable()
export class AccessTokenRefreshService {

    private readonly logger = new Logger(AccessTokenRefreshService.name)

    constructor(private readonly oauth2ClientService: OAuth2ClientService) { }

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
