import { Test, TestingModule } from '@nestjs/testing';
import { ChemblMoleculeItemService } from './chembl-molecule-item.service';

describe('ChemblMoleculeItemService', () => {
  let service: ChemblMoleculeItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChemblMoleculeItemService],
    }).compile();

    service = module.get<ChemblMoleculeItemService>(ChemblMoleculeItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
