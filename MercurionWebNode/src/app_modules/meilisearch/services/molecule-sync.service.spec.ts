import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeSyncService } from './molecule-sync.service';

describe('MoleculeSyncService', () => {
  let service: MoleculeSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeSyncService],
    }).compile();

    service = module.get<MoleculeSyncService>(MoleculeSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
