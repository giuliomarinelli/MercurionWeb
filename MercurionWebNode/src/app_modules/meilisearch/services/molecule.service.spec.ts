import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeService } from './molecule.service';

describe('MoleculeService', () => {
  let service: MoleculeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoleculeService],
    }).compile();

    service = module.get<MoleculeService>(MoleculeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
