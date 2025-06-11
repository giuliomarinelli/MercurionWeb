import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';

describe('MoleculeCollectionItemJoinService', () => {
  let service: MoleculeCollectionItemJoinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeCollectionItemJoinService],
    }).compile();

    service = module.get<MoleculeCollectionItemJoinService>(MoleculeCollectionItemJoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
