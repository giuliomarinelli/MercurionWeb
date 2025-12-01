import { ConfigService } from '@nestjs/config';
import { GoogleProviderClient } from './google-provider-client';

describe('GoogleProviderClientService', () => {
  let service: GoogleProviderClient;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'https://example.com/callback',
      }),
    } as unknown as ConfigService;
    service = new GoogleProviderClient(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
