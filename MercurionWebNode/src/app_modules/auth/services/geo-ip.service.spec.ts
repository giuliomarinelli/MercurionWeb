import { Test, TestingModule } from '@nestjs/testing';
import { GeoIpService } from './geo-ip.service';

describe('GeoIpService', () => {
  let service: GeoIpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeoIpService],
    }).compile();

    service = module.get<GeoIpService>(GeoIpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
