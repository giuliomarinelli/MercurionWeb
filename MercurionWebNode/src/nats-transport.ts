import type { ConfigService } from '@nestjs/config'
import { type NatsOptions, Transport } from '@nestjs/microservices'

import type { NatsServerUrl } from './config/nats-endpoint'

export function getNatsServerUrl(
    config: Pick<ConfigService, 'getOrThrow'>
): NatsServerUrl {
    return config.getOrThrow<NatsServerUrl>('App.natsUrl')
}

export function createNatsTransportOptions(
    config: Pick<ConfigService, 'getOrThrow'>
): NatsOptions {
    return {
        transport: Transport.NATS,
        options: {
            servers: [getNatsServerUrl(config)]
        }
    }
}
