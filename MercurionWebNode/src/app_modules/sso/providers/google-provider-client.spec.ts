import { ConfigService } from '@nestjs/config';
import { GoogleProviderClient } from './google-provider-client';
import { LoggerPort } from 'src/logging/logger.port';

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
    const loggerFactory = {
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as LoggerPort;
    service = new GoogleProviderClient(configService, loggerFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
