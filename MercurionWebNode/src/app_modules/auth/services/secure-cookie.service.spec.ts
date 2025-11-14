import { Test, TestingModule } from '@nestjs/testing';
import { SecureCookieService } from './secure-cookie.service';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('SecureCookieService', () => {
  let service: SecureCookieService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecureCookieService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<SecureCookieService>(SecureCookieService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
