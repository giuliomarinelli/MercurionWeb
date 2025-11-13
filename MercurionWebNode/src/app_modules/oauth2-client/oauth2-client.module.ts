import { Module, forwardRef } from '@nestjs/common';
import { OAuth2PersistenceService } from './services/o-auth2-persistence.service';
import { OAuth2ClientService } from './services/oauth2-client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuth2TokenEntity } from './Models/entities/oauth2-token.entity';
import { RedisModule } from '../redis/redis.module';
import { OAuth2ClientController } from './controllers/o-auth2-client.controller';
import { AccessTokenRefreshService } from './services/access-token-refresh.service';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OAuth2TokenEntity]),
        forwardRef(() => RedisModule),
        MeilisearchModule
    ],
    providers: [OAuth2PersistenceService, OAuth2ClientService, AccessTokenRefreshService],
    controllers: [OAuth2ClientController],
    exports: [AccessTokenRefreshService, OAuth2ClientService]
})
export class OAuth2ClientModule { }
