import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import Redis from 'ioredis';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ConfigService } from '@nestjs/config';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: RedisService,
          useValue: {
            hset: jest.fn(),
            hget: jest.fn(),
            hdel: jest.fn(),
            hgetall: jest.fn(),
            hkeys: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            expire: jest.fn(),
            scanIterate: jest.fn().mockResolvedValue([]),
            sismember: jest.fn(),
          },
        },
        { provide: Redis, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'App.sessionSignatureSecret') return 'secret';
              if (key === 'Session.shortSessionLasting') return 3600;
              if (key === 'Session.persistentSessionLasting') return 7200;
              return '';
            }),
          },
        },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
