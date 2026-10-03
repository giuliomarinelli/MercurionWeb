import { Transport } from '@nestjs/microservices';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { PcpService } from './services/pcp.service';

import type { NatsServerUrl } from '../../config/nats-endpoint';
import { createNatsTransportOptions } from '../../nats-transport';
import {
  createMercurionAIClientOptions,
  MercurionAIModule
} from './mercurion-ai.module';

describe('MercurionAIModule', () => {
  it('should be defined', () => {
    expect(new MercurionAIModule()).toBeDefined();
  });

  it('provides and exports PcpService for other application modules', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, MercurionAIModule)).toContain(PcpService);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, MercurionAIModule)).toContain(PcpService);
  });

  it('uses the same canonical NATS server URL as application bootstrap', async () => {
    const serverUrl = 'nats://localhost:4223' as NatsServerUrl;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(serverUrl)
    };

    const bootstrapOptions = createNatsTransportOptions(config);
    const clientOptions = await createMercurionAIClientOptions(config);

    expect(bootstrapOptions).toEqual({
      transport: Transport.NATS,
      options: { servers: [serverUrl] }
    });
    expect(clientOptions).toEqual(bootstrapOptions);
    expect(config.getOrThrow).toHaveBeenNthCalledWith(1, 'App.natsUrl');
    expect(config.getOrThrow).toHaveBeenNthCalledWith(2, 'App.natsUrl');
  });
});
