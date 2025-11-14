import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenRefreshService } from './access-token-refresh.service';
import { OAuth2ClientService } from './oauth2-client.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('AccessTokenRefreshService', () => {
  let service: AccessTokenRefreshService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenRefreshService,
        { provide: OAuth2ClientService, useValue: { getAccessToken: jest.fn() } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<AccessTokenRefreshService>(AccessTokenRefreshService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
