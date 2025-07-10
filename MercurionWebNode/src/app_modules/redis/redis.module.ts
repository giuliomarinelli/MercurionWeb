import { forwardRef, Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { PubSubService } from './services/pub-sub.service';
import Redis from 'ioredis';
import { OAuth2ClientModule } from '../oauth2-client/oauth2-client.module';

@Module({
    imports: [forwardRef(() => OAuth2ClientModule)],
    providers: [
        {
            provide: Redis,
            useFactory: async () => {
                return new Redis({
                    host: 'localhost',
                    port: 6378,
                })
            },
        },
        RedisService,
        PubSubService
    ],
    exports: [RedisService, Redis, PubSubService]
})
export class RedisModule { }
