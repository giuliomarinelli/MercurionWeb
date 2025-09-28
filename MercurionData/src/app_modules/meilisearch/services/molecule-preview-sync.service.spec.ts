import { Test, TestingModule } from '@nestjs/testing';
import { MoleculePreviewSyncService } from './molecule-preview-sync.service';

describe('MoleculePreviewSyncService', () => {
  let service: MoleculePreviewSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculePreviewSyncService],
    }).compile();

    service = module.get<MoleculePreviewSyncService>(MoleculePreviewSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
