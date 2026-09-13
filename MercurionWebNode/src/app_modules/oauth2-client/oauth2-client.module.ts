import { Global, Module } from '@nestjs/common';
import { OAuth2PersistenceService } from './services/o-auth2-persistence.service';
import { OAuth2ClientService } from './services/oauth2-client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuth2TokenEntity } from './Models/entities/oauth2-token.entity';
import { OAuth2ClientController } from './controllers/o-auth2-client.controller';
import { OAuth2AccessTokenRefreshService } from './services/access-token-refresh.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([OAuth2TokenEntity]),
    ],
    providers: [OAuth2PersistenceService, OAuth2ClientService, OAuth2AccessTokenRefreshService],
    controllers: [OAuth2ClientController],
    exports: [OAuth2AccessTokenRefreshService, OAuth2ClientService]
})
export class OAuth2ClientModule { }
