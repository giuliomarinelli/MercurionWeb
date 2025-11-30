import { Test, TestingModule } from '@nestjs/testing';
import { GoogleProviderClientService } from './google-provider-client';

describe('GoogleProviderClientService', () => {
  let service: GoogleProviderClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleProviderClientService],
    }).compile();

    service = module.get<GoogleProviderClientService>(GoogleProviderClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
