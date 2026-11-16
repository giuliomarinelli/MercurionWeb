import type { ConfigService } from '@nestjs/config'
import { type NatsOptions, Transport } from '@nestjs/microservices'

import type { NatsServerUrl } from './config/nats-endpoint'
import type { AppConfiguration } from './config/config.types'

export function getNatsServerUrl(
    config: Pick<ConfigService, 'getOrThrow'>
): NatsServerUrl {
    return config.getOrThrow<NatsServerUrl>('App.natsUrl')
}

export function createNatsTransportOptions(
    config: Pick<ConfigService, 'getOrThrow'>
): NatsOptions {
    const serverUrl = getNatsServerUrl(config)
    const credentials = config.getOrThrow<AppConfiguration['natsCredentials']>('App.natsCredentials')
    return {
        transport: Transport.NATS,
        options: {
            servers: [serverUrl],
            ...(credentials.username !== undefined ? {
                user: credentials.username,
                pass: credentials.password
            } : {})
        }
    }
}
