import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import Redis from 'ioredis';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: RedisService, useValue: { hset: jest.fn(), hget: jest.fn(), hdel: jest.fn(), hgetall: jest.fn(), hkeys: jest.fn(), set: jest.fn(), get: jest.fn(), del: jest.fn(), expire: jest.fn() } },
        { provide: Redis, useValue: {} },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
