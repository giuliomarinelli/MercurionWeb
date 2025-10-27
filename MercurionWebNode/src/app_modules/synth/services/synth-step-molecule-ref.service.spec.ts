import { Test, TestingModule } from '@nestjs/testing';
import { SynthStepMoleculeRefService } from './synth-step-molecule-ref.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SynthStepMoleculeRef } from '../Models/entities/synth-step-molecule-ref.entity';
import { SynthStep } from '../Models/entities/synth-step.entity';
import { MoleculeCollectionItemEntity } from '../../molecule-collection/Models/entities/molecule-collection-item.entity';

describe('SyntheticStepMoleculeRefService', () => {
  let service: SynthStepMoleculeRefService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthStepMoleculeRefService,
        {
          provide: getRepositoryToken(SynthStepMoleculeRef),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SynthStep),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(MoleculeCollectionItemEntity),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SynthStepMoleculeRefService>(SynthStepMoleculeRefService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
