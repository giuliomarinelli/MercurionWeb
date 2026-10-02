import { Module } from '@nestjs/common';
import { SocketIOGateway } from './socket.io.gateway';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { RealtimeModule } from './realtime.module';

@Module({
    imports: [AuthModule, RedisModule, RealtimeModule],
    providers: [SocketIOGateway]
})
export class SocketIoModule {}
