import { Module } from '@nestjs/common';
import { SocketIOGateway } from './socket.io.gateway';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [MeilisearchModule, AuthModule, RedisModule],
    providers: [SocketIOGateway]
})
export class SocketIoModule {}
