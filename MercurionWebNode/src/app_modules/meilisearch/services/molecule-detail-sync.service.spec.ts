import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeDetailSyncService } from './molecule-detail-sync.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeDetailDBView } from '../../chembl/Models/entities/molecule-detail-db-view.entity';
import { ActivityViewEntity } from '../../chembl/Models/entities/activity-view.entity';
import { ToxicityViewEntity } from '../../chembl/Models/entities/toxicity-view.entity';

describe('MoleculeDetailSyncService', () => {
  let service: MoleculeDetailSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeDetailSyncService,
        { provide: getRepositoryToken(MoleculeDetailDBView, 'ChemblDB'), useValue: {} },
        { provide: getRepositoryToken(ActivityViewEntity, 'ChemblDB'), useValue: {} },
        { provide: getRepositoryToken(ToxicityViewEntity, 'ChemblDB'), useValue: {} },
        { provide: 'MEILISEARCH_CLIENT', useValue: { index: jest.fn().mockReturnValue({}) } },
      ],
    }).compile();

    service = module.get<MoleculeDetailSyncService>(MoleculeDetailSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
