import { Test, TestingModule } from '@nestjs/testing';
import { MercurionService } from './mercurion.service';

describe('MercurionService', () => {
  let service: MercurionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercurionService],
    }).compile();

    service = module.get<MercurionService>(MercurionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
