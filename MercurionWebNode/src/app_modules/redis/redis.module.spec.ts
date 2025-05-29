import { RedisModule } from './redis.module';

import { Test } from '@nestjs/testing';
import Redis from 'ioredis';

describe('RedisModule', () => {
  it('should compile the redis module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule],
    })
      .overrideProvider(Redis)
      .useValue({})
      .compile();
    expect(moduleRef).toBeDefined();
  });
});
