/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { connect, NatsConnection, StringCodec } from 'nats';

@Injectable()
export class EmbeddingClientService {
    private readonly logger = new Logger(EmbeddingClientService.name);
    private nc: NatsConnection;
    private sc = StringCodec();

    async onModuleInit() {
        this.nc = await connect({ servers: 'nats://localhost:4223' });
        this.logger.log('🔵 Connected to NATS for embeddings');
    }

    async getSmilesEmbedding(smiles: string): Promise<number[]> {
        const msg = await this.nc.request(
            'inference.embedding.smiles',
            this.sc.encode(JSON.stringify({ smiles })),
            { timeout: 30000 }
        );

        const decoded = JSON.parse(this.sc.decode(msg.data));
        if (decoded.error) {
            throw new Error(decoded.error);
        }
        return decoded.embedding as number[];
    }
}
