import { Test, TestingModule } from '@nestjs/testing';
import { MeiliPreferredNameItSyncService } from './meili-preferred-name-it-sync.service';

describe('MeiliPreferredNameItSyncService', () => {
  let service: MeiliPreferredNameItSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeiliPreferredNameItSyncService],
    }).compile();

    service = module.get<MeiliPreferredNameItSyncService>(MeiliPreferredNameItSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
