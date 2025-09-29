/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common'
import { connect, NatsConnection, StringCodec, NatsError, ErrorCode } from 'nats'

@Injectable()
export class EmbeddingClientService {
    private readonly logger = new Logger(EmbeddingClientService.name)
    private nc!: NatsConnection
    private sc = StringCodec()

    async onModuleInit() {
        this.nc = await connect({
            servers: 'nats://127.0.0.1:4223',     // ✅ 127.0.0.1
            maxReconnectAttempts: -1,
            reconnectTimeWait: 1000,
        })
        this.logger.log('🔵 Connected to NATS for embeddings')
        // ping/flush per certezza
        await this.nc.flush()
        await this.nc.request('inference.embedding.smiles', "{smiles: \"test\"}", { timeout: 30000 })
    }

    async getSmilesEmbedding(smiles: string): Promise<number[]> {
        try {
            const data = this.sc.encode(JSON.stringify({ smiles }))
            const msg = await this.nc.request('inference.embedding.smiles', data, { timeout: 30000 })
            const decoded = JSON.parse(this.sc.decode(msg.data))
            if (decoded.error) throw new Error(decoded.error)
            return decoded.embedding as number[]
        } catch (err) {
            const ne = err as NatsError
            if (ne?.code === ErrorCode.NoResponders) {
                this.logger.error('❌ NATS: no responders su inference.embedding.smiles')
            } else if (ne?.code === ErrorCode.Timeout) {
                this.logger.error('⏳ NATS: timeout in attesa della reply')
            } else {
                this.logger.error(`❌ NATS request error: ${ne?.message || err}`)
            }
            throw err
        }
    }
}
