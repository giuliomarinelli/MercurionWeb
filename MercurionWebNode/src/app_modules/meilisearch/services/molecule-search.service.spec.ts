import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeSearchService } from './molecule-search.service';

describe('MoleculeSearchService', () => {
  let service: MoleculeSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeSearchService],
    }).compile();

    service = module.get<MoleculeSearchService>(MoleculeSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
