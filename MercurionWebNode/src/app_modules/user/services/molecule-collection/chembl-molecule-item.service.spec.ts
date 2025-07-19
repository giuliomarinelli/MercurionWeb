import { Test, TestingModule } from '@nestjs/testing';
import { ChEMBLMoleculeItemService } from './chembl-molecule-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChEMBLMoleculeItemEntity } from '../../Models/entities/molecule-collection/chembl-molecule-item.entity';
import { MoleculeCollection } from '../../Models/entities/molecule-collection/molecule-collection.entity';
import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { DataSource } from 'typeorm';

describe('ChemblMoleculeItemService', () => {
  let service: ChEMBLMoleculeItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChEMBLMoleculeItemService,
        {
          provide: MoleculeCollectionItemJoinService,
          useValue: { add: jest.fn(), remove: jest.fn() },
        },
        {
          provide: getRepositoryToken(ChEMBLMoleculeItemEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MoleculeCollection),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ChEMBLMoleculeItemService>(ChEMBLMoleculeItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
