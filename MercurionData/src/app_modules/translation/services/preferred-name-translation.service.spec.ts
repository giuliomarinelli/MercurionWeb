import { getRepositoryToken } from '@nestjs/typeorm'
import { MoleculeNameI18n } from '../Models/entities/molecule-name-i18n.entity'
import { Test, TestingModule } from '@nestjs/testing'
import { PreferredNameTranslationService } from './preferred-name-translation.service'

describe('PreferredNameTranslationService', () => {
  let service: PreferredNameTranslationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferredNameTranslationService,
        { provide: getRepositoryToken(MoleculeNameI18n, 'MercurionConn'), useValue: {} },
      ],
    }).compile()

    service = module.get<PreferredNameTranslationService>(PreferredNameTranslationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
