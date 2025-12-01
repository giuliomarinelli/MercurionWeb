import { ConfigService } from '@nestjs/config';
import { GitHubProviderClient } from './github-provider-client';

describe('GitHubProviderClientService', () => {
  let service: GitHubProviderClient;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'https://example.com/callback',
      }),
    } as unknown as ConfigService;
    service = new GitHubProviderClient(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
