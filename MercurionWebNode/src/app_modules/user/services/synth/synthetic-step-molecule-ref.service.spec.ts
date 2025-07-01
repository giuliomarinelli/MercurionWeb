import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticStepMoleculeRefService } from './synthetic-step-molecule-ref.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyntheticStepMoleculeRef } from '../../Models/entities/synth/synthetic-step-molecule-ref.entity';
import { SyntheticStepEntity } from '../../Models/entities/synth/synthetic-step.entity';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';

describe('SyntheticStepMoleculeRefService', () => {
  let service: SyntheticStepMoleculeRefService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyntheticStepMoleculeRefService,
        {
          provide: getRepositoryToken(SyntheticStepMoleculeRef),
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
          provide: getRepositoryToken(SyntheticStepEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(MoleculeCollectionItemEntity),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SyntheticStepMoleculeRefService>(SyntheticStepMoleculeRefService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
