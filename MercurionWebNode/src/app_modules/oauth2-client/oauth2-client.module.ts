import { Global, Module } from '@nestjs/common';
import { OAuth2PersistenceService } from './services/o-auth2-persistence.service';
import { OAuth2ClientService } from './services/oauth2-client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuth2TokenEntity } from './models/entities/oauth2-token.entity';
import { OAuth2ClientController } from './controllers/o-auth2-client.controller';
import { OAuth2AccessTokenRefreshService } from './services/access-token-refresh.service';
import { ExternalHttpModule } from 'src/infrastructure/external-http/external-http.module'
import { OAuthStateService } from './services/oauth-state.service'
import { ProviderCredentialCipherService } from './services/provider-credential-cipher.service'

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([OAuth2TokenEntity]),
        ExternalHttpModule,
    ],
    providers: [OAuth2PersistenceService, ProviderCredentialCipherService, OAuth2ClientService, OAuth2AccessTokenRefreshService, OAuthStateService],
    controllers: [OAuth2ClientController],
    exports: [OAuth2AccessTokenRefreshService, OAuth2ClientService, OAuthStateService]
})
export class OAuth2ClientModule { }
