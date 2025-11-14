import { Test, TestingModule } from '@nestjs/testing';
import { GeoIpService } from './geo-ip.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('GeoIpService', () => {
  let service: GeoIpService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoIpService,
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<GeoIpService>(GeoIpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
