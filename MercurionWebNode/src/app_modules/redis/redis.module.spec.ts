import { RedisModule } from './redis.module';

import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { OAuth2PersistenceService } from '../oauth2-client/services/o-auth2-persistence.service';
import { OAuth2ClientService } from '../oauth2-client/services/oauth2-client.service';
import { AccessTokenRefreshService } from '../oauth2-client/services/access-token-refresh.service';

describe('RedisModule', () => {
  it('should compile the redis module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule],
    })
      .overrideProvider(Redis)
      .useValue({ duplicate: jest.fn(() => ({})) })
      .overrideProvider(OAuth2PersistenceService)
      .useValue({})
      .overrideProvider(OAuth2ClientService)
      .useValue({})
      .overrideProvider(AccessTokenRefreshService)
      .useValue({})
      .compile();
    expect(moduleRef).toBeDefined();
  });
});
