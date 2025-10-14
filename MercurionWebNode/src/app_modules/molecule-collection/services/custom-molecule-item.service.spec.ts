import { Test, TestingModule } from '@nestjs/testing';
import { CustomMoleculeItemService } from './custom-molecule-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomMoleculeItemEntity } from '../Models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';

describe('CustomMoleculeItemService', () => {
  let service: CustomMoleculeItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomMoleculeItemService,
        {
          provide: MoleculeCollectionItemJoinService,
          useValue: { add: jest.fn(), remove: jest.fn() },
        },
        {
          provide: getRepositoryToken(CustomMoleculeItemEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MoleculeCollection),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomMoleculeItemService>(CustomMoleculeItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
