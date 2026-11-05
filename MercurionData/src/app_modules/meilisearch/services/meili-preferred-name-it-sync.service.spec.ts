import { getRepositoryToken } from '@nestjs/typeorm'
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv'
import { MoleculeNameI18n } from 'src/app_modules/translation/Models/entities/molecule-name-i18n.entity'
import { Test, TestingModule } from '@nestjs/testing'
import { MeiliPreferredNameItSyncService } from './meili-preferred-name-it-sync.service'

describe('MeiliPreferredNameItSyncService', () => {
  let service: MeiliPreferredNameItSyncService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeiliPreferredNameItSyncService,
        { provide: getRepositoryToken(MoleculeIndexView), useValue: {} },
        { provide: getRepositoryToken(MoleculeNameI18n, 'MercurionConn'), useValue: {} },
        { provide: 'MEILISEARCH_CLIENT', useValue: {} },
      ],
    }).compile()

    service = module.get<MeiliPreferredNameItSyncService>(MeiliPreferredNameItSyncService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
