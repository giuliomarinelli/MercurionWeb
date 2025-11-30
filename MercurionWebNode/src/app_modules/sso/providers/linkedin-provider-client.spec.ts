import { Test, TestingModule } from '@nestjs/testing';
import { LinkedInProviderClient } from './linkedin-provider-client';

describe('LinkedInProviderClientService', () => {
  let service: LinkedInProviderClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkedInProviderClient],
    }).compile();

    service = module.get<LinkedInProviderClient>(LinkedInProviderClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
