import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeNameI18nService } from './molecule-name-i18n.service';

describe('MoleculeNameI18nService', () => {
  let service: MoleculeNameI18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeNameI18nService],
    }).compile();

    service = module.get<MoleculeNameI18nService>(MoleculeNameI18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
