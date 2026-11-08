import { Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { MODULE_METADATA } from '@nestjs/common/constants'
import { PcpService } from './services/pcp.service'

import type { NatsServerUrl } from '../../config/nats-endpoint'
import { createNatsTransportOptions } from '../../nats-transport'
import {
  createMercurionAIClientOptions,
  MercurionAIModule
} from './mercurion-ai.module'

describe('MercurionAIModule', () => {
  it('should be defined', () => {
    expect(new MercurionAIModule()).toBeDefined()
  })

  it('provides and exports PcpService for other application modules', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, MercurionAIModule)).toContain(PcpService)
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, MercurionAIModule)).toContain(PcpService)
  })

  it.each([{}, { username: 'synthetic-nest-user', password: 'synthetic-@$:password' }])(
    'uses the same NATS URL and credentials as application bootstrap: %j', async credentials => {
    const serverUrl = 'nats://localhost:4223' as NatsServerUrl
    const config = new ConfigService({ App: { natsUrl: serverUrl, natsCredentials: credentials } })
    const getOrThrow = jest.spyOn(config, 'getOrThrow')

    const bootstrapOptions = createNatsTransportOptions(config)
    const clientOptions = await createMercurionAIClientOptions(config)

    expect(bootstrapOptions).toEqual({
      transport: Transport.NATS,
      options: { servers: [serverUrl], ...('username' in credentials ? {
        user: credentials.username, pass: credentials.password
      } : {}) }
    })
    expect(clientOptions).toEqual(bootstrapOptions)
    expect(getOrThrow).toHaveBeenNthCalledWith(1, 'App.natsUrl')
    expect(getOrThrow).toHaveBeenNthCalledWith(2, 'App.natsCredentials')
    expect(getOrThrow).toHaveBeenNthCalledWith(3, 'App.natsUrl')
    expect(getOrThrow).toHaveBeenNthCalledWith(4, 'App.natsCredentials')
  })
})
