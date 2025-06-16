import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenRefreshService } from './access-token-refresh.service';

describe('AccessTokenRefreshService', () => {
  let service: AccessTokenRefreshService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessTokenRefreshService],
    }).compile();

    service = module.get<AccessTokenRefreshService>(AccessTokenRefreshService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
