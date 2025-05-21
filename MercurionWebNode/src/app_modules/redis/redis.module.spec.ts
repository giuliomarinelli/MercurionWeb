import { RedisModule } from './redis.module';

import { Test } from '@nestjs/testing';

describe('RedisModule', () => {
  it('should compile the redis module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
