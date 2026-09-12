import { Global, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { PubSubService } from './services/pub-sub.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RedisConfiguration } from 'src/config/config.types';
import { MeiliLoggerService } from '../meilisearch/services/meili-logger.service';
import { RedisCapabilityService } from './services/redis-capability.service'

@Global()
@Module({
    imports: [
    ],
    providers: [
        {
            provide: Redis,
            inject: [ConfigService, MeiliLoggerService],
            useFactory: async (configService: ConfigService, loggerFactory: MeiliLoggerService) => {

                const { host, port, password } = configService.get<RedisConfiguration>('Redis')!;

                const logger = loggerFactory.forContext(RedisModule.name)

                const client = new Redis({
                    host,
                    port,
                    password,
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
        RedisCapabilityService,
        PubSubService
    ],
    exports: [RedisService, Redis, RedisCapabilityService, PubSubService]
})
export class RedisModule { }
