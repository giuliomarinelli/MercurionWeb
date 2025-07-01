import { Test, TestingModule } from '@nestjs/testing';
import { PubSubService } from './pub-sub.service';
import { RedisService } from './redis.service';
import Redis from 'ioredis';
import { AccessTokenRefreshService } from 'src/app_modules/oauth2-client/services/access-token-refresh.service';

describe('PubSubService', () => {
  let service: PubSubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubService,
        { provide: AccessTokenRefreshService, useValue: { refreshAccessToken: jest.fn() } },
        { provide: RedisService, useValue: { getClient: () => ({ duplicate: jest.fn().mockReturnValue({ subscribe: jest.fn(), on: jest.fn() }) }) } },
        { provide: Redis, useValue: {} },
      ],
    }).compile();

    service = module.get<PubSubService>(PubSubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
