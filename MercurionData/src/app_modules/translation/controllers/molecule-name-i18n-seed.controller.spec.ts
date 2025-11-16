import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeNameI18nSeedController } from './molecule-name-i18n-seed.controller';

describe('MoleculeNameI18nSeedController', () => {
  let controller: MoleculeNameI18nSeedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoleculeNameI18nSeedController],
    }).compile();

    controller = module.get<MoleculeNameI18nSeedController>(MoleculeNameI18nSeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
