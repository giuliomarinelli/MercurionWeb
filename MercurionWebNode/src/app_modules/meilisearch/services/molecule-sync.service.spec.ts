import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeSyncService } from './molecule-sync.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculePreviewDBView } from '../../chembl/Models/entities/molecule-preview-db-view.entity';

describe('MoleculeSyncService', () => {
  let service: MoleculeSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeSyncService,
        { provide: getRepositoryToken(MoleculePreviewDBView), useValue: {} },
        { provide: 'MEILISEARCH_CLIENT', useValue: {} },
      ],
    }).compile();

    service = module.get<MoleculeSyncService>(MoleculeSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
