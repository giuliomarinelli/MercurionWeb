import { Test, TestingModule } from '@nestjs/testing';
import { GeoIpService } from './geo-ip.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('GeoIpService', () => {
  let service: GeoIpService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoIpService,
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<GeoIpService>(GeoIpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
