import { Test, TestingModule } from '@nestjs/testing';
import { PasswordEncoderService } from './password-encoder.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ConfigService } from '@nestjs/config';

describe('PasswordEncoderService', () => {
  let service: PasswordEncoderService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordEncoderService,
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('pepper') } },
      ],
    }).compile();

    service = module.get<PasswordEncoderService>(PasswordEncoderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
