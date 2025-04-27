import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.io.gateway';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
    imports: [MeilisearchModule],
    providers: [SocketGateway]
})
export class SocketIoModule {}
