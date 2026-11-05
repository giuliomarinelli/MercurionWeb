import { getRepositoryToken } from '@nestjs/typeorm'
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv'
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity'
import { Test, TestingModule } from '@nestjs/testing'
import { PreferredNameSyncService } from './preferred-name-backfill.service'

describe('PreferredNameSyncService', () => {
  let service: PreferredNameSyncService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferredNameSyncService,
        { provide: getRepositoryToken(MoleculeIndexView), useValue: {} },
        { provide: getRepositoryToken(MoleculeEmbedding, 'MercurionConn'), useValue: {} },
      ],
    }).compile()

    service = module.get<PreferredNameSyncService>(PreferredNameSyncService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
