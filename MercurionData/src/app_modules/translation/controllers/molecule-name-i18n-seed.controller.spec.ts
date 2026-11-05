import { MoleculeNameI18nSeedService } from '../molecule-name-i18n.service'
import { Test, TestingModule } from '@nestjs/testing'
import { MoleculeNameI18nSeedController } from './molecule-name-i18n-seed.controller'

describe('MoleculeNameI18nSeedController', () => {
  let controller: MoleculeNameI18nSeedController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoleculeNameI18nSeedController],
      providers: [
        { provide: MoleculeNameI18nSeedService, useValue: {} },
      ],
    }).compile()

    controller = module.get<MoleculeNameI18nSeedController>(MoleculeNameI18nSeedController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
