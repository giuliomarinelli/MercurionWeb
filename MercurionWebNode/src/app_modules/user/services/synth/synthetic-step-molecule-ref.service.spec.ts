import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticStepMoleculeRefService } from './synthetic-step-molecule-ref.service';

describe('SyntheticStepMoleculeRefService', () => {
  let service: SyntheticStepMoleculeRefService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyntheticStepMoleculeRefService],
    }).compile();

    service = module.get<SyntheticStepMoleculeRefService>(SyntheticStepMoleculeRefService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
