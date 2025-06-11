import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionService } from './molecule-collection.service';

describe('MoleculeCollectionService', () => {
  let service: MoleculeCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeCollectionService],
    }).compile();

    service = module.get<MoleculeCollectionService>(MoleculeCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
