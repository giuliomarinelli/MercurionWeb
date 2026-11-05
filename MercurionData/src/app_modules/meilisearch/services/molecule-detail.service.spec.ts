import { getRepositoryToken } from '@nestjs/typeorm'
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv'
import { Test, TestingModule } from '@nestjs/testing'
import { MoleculeDetailSyncService } from './molecule-detail-sync.service'

describe('MoleculeDetailService', () => {
  let service: MoleculeDetailSyncService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeDetailSyncService,
        { provide: getRepositoryToken(MoleculeIndexView), useValue: {} },
        { provide: 'MEILISEARCH_CLIENT', useValue: {} },
      ],
    }).compile()

    service = module.get<MoleculeDetailSyncService>(MoleculeDetailSyncService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
