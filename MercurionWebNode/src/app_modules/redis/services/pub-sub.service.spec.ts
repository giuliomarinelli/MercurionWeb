import { Test, TestingModule } from '@nestjs/testing';
import { PubSubService } from './pub-sub.service';
import { RedisService } from './redis.service';
import Redis from 'ioredis';
import { OAuth2AccessTokenRefreshService } from 'src/app_modules/oauth2-client/services/access-token-refresh.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { RedisCapabilityService } from './redis-capability.service'

describe('PubSubService', () => {
  let service: PubSubService;
  let redisClient: {
    duplicate: jest.Mock;
    config: jest.Mock;
    publish: jest.Mock;
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let subscriber: {
    on: jest.Mock;
    psubscribe: jest.Mock;
    subscribe: jest.Mock;
  };
  let assertRequiredCapabilities: jest.Mock

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    subscriber = {
      on: jest.fn(),
      psubscribe: jest.fn(),
      subscribe: jest.fn(),
    };
    assertRequiredCapabilities = jest.fn()
    redisClient = {
      duplicate: jest.fn().mockReturnValue(subscriber),
      config: jest.fn().mockResolvedValue(['notify-keyspace-events', 'Exg']),
      publish: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubService,
        { provide: OAuth2AccessTokenRefreshService, useValue: { refreshAccessToken: jest.fn() } },
        { provide: RedisService, useValue: { getClient: () => redisClient as unknown as Redis } },
        { provide: RedisCapabilityService, useValue: { assertRequiredCapabilities } },
        {
          provide: SessionService,
          useValue: {
            destroySessionByOwner: jest.fn(),
            getJtiListBySessionId: jest.fn().mockResolvedValue([]),
            revokeToken: jest.fn()
          }
        },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<PubSubService>(PubSubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers Redis keyspace subscriptions and listeners only once', async () => {
    await service.onModuleInit();
    await service.onModuleInit();

    expect(assertRequiredCapabilities).toHaveBeenCalledTimes(1);
    expect(subscriber.psubscribe).toHaveBeenCalledTimes(1);
    expect(subscriber.psubscribe).toHaveBeenCalledWith('__keyevent@0__:*');
    expect(subscriber.on).toHaveBeenCalledTimes(2);
    expect(subscriber.on).toHaveBeenNthCalledWith(1, 'error', expect.any(Function));
    expect(subscriber.on).toHaveBeenNthCalledWith(2, 'pmessage', expect.any(Function));
  });
});
