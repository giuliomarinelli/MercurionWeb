import { forwardRef, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { PubSubService } from './services/pub-sub.service';
import Redis from 'ioredis';
import { OAuth2ClientModule } from '../oauth2-client/oauth2-client.module';
import { AuthModule } from '../auth/auth.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { ConfigService } from '@nestjs/config';
import { RedisConfiguration } from 'src/config/config.types';
import { MeiliLoggerService } from '../meilisearch/services/meili-logger.service';

@Module({
    imports: [
        forwardRef(() => OAuth2ClientModule),
        forwardRef(() => AuthModule),
        MeilisearchModule
    ],
    providers: [
        {
            provide: Redis,
            inject: [ConfigService, MeiliLoggerService],
            useFactory: async (configService: ConfigService, loggerFactory: MeiliLoggerService) => {

                const { host, port } = configService.get<RedisConfiguration>('Redis')!;

                const logger = loggerFactory.forContext(RedisModule.name)

                const client = new Redis({
                    host,
                    port,
                    // opzionale ma spesso utile nei backend con pub/sub ecc.
                    maxRetriesPerRequest: null,
                    enableReadyCheck: true
                });

                client.on('error', (err) => {
                    // qui puoi usare il tuo logger Nest se vuoi
                    logger.warn('[Redis] error', { host, port, err })
                });

                client.on('connect', () => {
                    logger.log('[Redis] connected ✅', { host, port })
                });

                return client
            },
        },
        RedisService,
        PubSubService
    ],
    exports: [RedisService, Redis, PubSubService]
})
export class RedisModule { }
