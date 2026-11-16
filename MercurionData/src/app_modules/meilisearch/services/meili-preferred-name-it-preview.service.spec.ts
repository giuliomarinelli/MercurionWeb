import { getRepositoryToken } from '@nestjs/typeorm'
import { MoleculeNameI18n } from 'src/app_modules/translation/Models/entities/molecule-name-i18n.entity'
import { Test, TestingModule } from '@nestjs/testing'
import { MeiliPreferredNameItPreviewSyncService } from './meili-preferred-name-it-preview.service'

describe('MeiliPreferredNameItPreviewSyncService', () => {
  let service: MeiliPreferredNameItPreviewSyncService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeiliPreferredNameItPreviewSyncService,
        { provide: getRepositoryToken(MoleculeNameI18n, 'MercurionConn'), useValue: {} },
        { provide: 'MEILISEARCH_CLIENT', useValue: {} },
      ],
    }).compile()

    service = module.get<MeiliPreferredNameItPreviewSyncService>(MeiliPreferredNameItPreviewSyncService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
