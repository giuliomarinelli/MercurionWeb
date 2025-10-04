import { Test, TestingModule } from '@nestjs/testing';
import { PreferredNameBackfillService } from './preferred-name-backfill.service';

describe('PreferredNameBackfillService', () => {
  let service: PreferredNameBackfillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreferredNameBackfillService],
    }).compile();

    service = module.get<PreferredNameBackfillService>(PreferredNameBackfillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
