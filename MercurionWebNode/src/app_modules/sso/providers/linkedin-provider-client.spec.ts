import { ConfigService } from '@nestjs/config';
import { LinkedInProviderClient } from './linkedin-provider-client';

describe('LinkedInProviderClientService', () => {
  let service: LinkedInProviderClient;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'https://example.com/callback',
      }),
    } as unknown as ConfigService;
    service = new LinkedInProviderClient(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
