import { RedisModule } from './redis.module';

import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { OAuth2PersistenceService } from '../oauth2-client/services/o-auth2-persistence.service';
import { OAuth2ClientService } from '../oauth2-client/services/oauth2-client.service';
import { AccessTokenRefreshService } from '../oauth2-client/services/access-token-refresh.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OAuth2TokenEntity } from '../oauth2-client/Models/entities/oauth2-token.entity';
import { DataSource } from 'typeorm';

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
      .overrideProvider(getRepositoryToken(OAuth2TokenEntity))
      .useValue({})
      .overrideProvider(DataSource)
      .useValue({ getRepository: jest.fn() })
      .compile();
    expect(moduleRef).toBeDefined();
  });
});
