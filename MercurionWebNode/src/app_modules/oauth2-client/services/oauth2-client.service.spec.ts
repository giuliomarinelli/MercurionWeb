import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2ClientService } from './oauth2-client.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { OAuth2PersistenceService } from './o-auth2-persistence.service';
import { LoggerPort } from 'src/logging/logger.port';
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port';

describe('OAuth2ClientService', () => {
  let service: OAuth2ClientService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2ClientService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: OAuth2PersistenceService, useValue: { saveRefreshToken: jest.fn(), getRefreshToken: jest.fn() } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
        { provide: ExternalHttpPort, useValue: { post: jest.fn(), get: jest.fn() } },
      ],
    }).compile();

    service = module.get<OAuth2ClientService>(OAuth2ClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
