import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';

describe('MoleculeCollectionItemService', () => {
  let service: MoleculeCollectionItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeCollectionItemService],
    }).compile();

    service = module.get<MoleculeCollectionItemService>(MoleculeCollectionItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
