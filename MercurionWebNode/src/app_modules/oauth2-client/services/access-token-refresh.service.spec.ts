import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenRefreshService } from './access-token-refresh.service';
import { OAuth2ClientService } from './oauth2-client.service';

describe('AccessTokenRefreshService', () => {
  let service: AccessTokenRefreshService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenRefreshService,
        { provide: OAuth2ClientService, useValue: { getAccessToken: jest.fn() } },
      ],
    }).compile();

    service = module.get<AccessTokenRefreshService>(AccessTokenRefreshService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
