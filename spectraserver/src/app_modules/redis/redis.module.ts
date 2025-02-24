/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { PubSubService } from './services/pub-sub.service';
import Redis from 'ioredis';

@Module({
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
    exports: [RedisService]
})
export class RedisModule { }
