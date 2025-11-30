import { Test, TestingModule } from '@nestjs/testing';
import { SocialProviderRegistry } from './social-provider-registry';

describe('SocialProviderRegistryService', () => {
  let service: SocialProviderRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialProviderRegistry],
    }).compile();

    service = module.get<SocialProviderRegistry>(SocialProviderRegistry);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
