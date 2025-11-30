import { Test, TestingModule } from '@nestjs/testing';
import { GitHubProviderClient } from './github-provider-client';

describe('GitHubProviderClientService', () => {
  let service: GitHubProviderClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitHubProviderClient],
    }).compile();

    service = module.get<GitHubProviderClient>(GitHubProviderClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
