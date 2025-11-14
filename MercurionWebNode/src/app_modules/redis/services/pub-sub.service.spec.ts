import { Test, TestingModule } from '@nestjs/testing';
import { PubSubService } from './pub-sub.service';
import { RedisService } from './redis.service';
import Redis from 'ioredis';
import { AccessTokenRefreshService } from 'src/app_modules/oauth2-client/services/access-token-refresh.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('PubSubService', () => {
  let service: PubSubService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const redisClient = {
      duplicate: jest.fn().mockReturnValue({ on: jest.fn(), psubscribe: jest.fn(), subscribe: jest.fn() }),
      config: jest.fn().mockResolvedValue(['notify-keyspace-events', 'Exg']),
      publish: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    } as unknown as Redis;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubService,
        { provide: AccessTokenRefreshService, useValue: { refreshAccessToken: jest.fn() } },
        { provide: RedisService, useValue: { getClient: () => redisClient } },
        { provide: SessionService, useValue: { getJtiListBySessionId: jest.fn().mockResolvedValue([]), revokeToken: jest.fn() } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<PubSubService>(PubSubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
