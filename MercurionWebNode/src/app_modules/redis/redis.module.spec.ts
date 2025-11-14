import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './services/redis.service';
import { PubSubService } from './services/pub-sub.service';
import { AccessTokenRefreshService } from '../oauth2-client/services/access-token-refresh.service';
import { SessionService } from '../auth/services/session.service';
import { MeiliLoggerService } from '../meilisearch/services/meili-logger.service';
import Redis from 'ioredis';

describe('RedisModule (providers wiring)', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const mockRedisClient = {
      duplicate: jest.fn(() => ({
        on: jest.fn(),
        psubscribe: jest.fn(),
        subscribe: jest.fn(),
      })),
      config: jest.fn().mockResolvedValue(['notify-keyspace-events', 'Ex']),
      publish: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    } as unknown as Redis;

    moduleRef = await Test.createTestingModule({
      providers: [
        { provide: Redis, useValue: mockRedisClient },
        RedisService,
        {
          provide: AccessTokenRefreshService,
          useValue: { refreshAccessToken: jest.fn() },
        },
        {
          provide: SessionService,
          useValue: {
            getJtiListBySessionId: jest.fn().mockResolvedValue([]),
            revokeToken: jest.fn(),
          },
        },
        {
          provide: MeiliLoggerService,
          useValue: { forContext: jest.fn().mockReturnValue(mockLogger) },
        },
        PubSubService,
      ],
    }).compile();
  });

  it('exposes RedisService and PubSubService as singletons', () => {
    const redisService = moduleRef.get(RedisService);
    const pubSubService = moduleRef.get(PubSubService);
    expect(redisService).toBeInstanceOf(RedisService);
    expect(pubSubService).toBeInstanceOf(PubSubService);
  });
});
