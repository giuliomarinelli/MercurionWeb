import { Module } from '@nestjs/common';
import { SocketIOGateway } from './socket.io.gateway';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [AuthModule, RedisModule],
    providers: [SocketIOGateway]
})
export class SocketIoModule {}
