import { Module } from '@nestjs/common';
import { OAuth2PersistenceService } from './services/o-auth2-persistence.service';
import { OAuth2ClientService } from './services/oauth2-client.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuth2TokenEntity } from './Models/entities/oauth2-token.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [TypeOrmModule.forFeature([OAuth2TokenEntity]), RedisModule],
    providers: [OAuth2PersistenceService, OAuth2ClientService]
})
export class OAuth2ClientModule { }
