import { ConfigService } from '@nestjs/config';
import { DiscordProviderClient } from './discord-provider-client';
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port';

describe('DiscordProviderClientService', () => {
  let service: DiscordProviderClient;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'https://example.com/callback',
      }),
    } as unknown as ConfigService;
    service = new DiscordProviderClient(configService, {} as ExternalHttpPort);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
