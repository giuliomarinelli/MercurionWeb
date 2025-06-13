import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticRouteService } from './synthetic-route.service';

describe('SyntheticRouteService', () => {
  let service: SyntheticRouteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyntheticRouteService],
    }).compile();

    service = module.get<SyntheticRouteService>(SyntheticRouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
