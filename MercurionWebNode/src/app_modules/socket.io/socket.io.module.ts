import { Module } from '@nestjs/common';
import { SocketIOGateway } from './socket.io.gateway';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [MeilisearchModule, AuthModule],
    providers: [SocketIOGateway]
})
export class SocketIoModule {}
