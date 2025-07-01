import { Test, TestingModule } from '@nestjs/testing';
import { ChEMBLMoleculeItemService } from './chembl-molecule-item.service';

describe('ChemblMoleculeItemService', () => {
  let service: ChEMBLMoleculeItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChEMBLMoleculeItemService],
    }).compile();

    service = module.get<ChEMBLMoleculeItemService>(ChEMBLMoleculeItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
