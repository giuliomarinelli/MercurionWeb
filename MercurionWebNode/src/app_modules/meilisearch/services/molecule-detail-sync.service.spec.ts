import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeDetailSyncService } from './molecule-detail-sync.service';

describe('MoleculeDetailSyncService', () => {
  let service: MoleculeDetailSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeDetailSyncService],
    }).compile();

    service = module.get<MoleculeDetailSyncService>(MoleculeDetailSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
