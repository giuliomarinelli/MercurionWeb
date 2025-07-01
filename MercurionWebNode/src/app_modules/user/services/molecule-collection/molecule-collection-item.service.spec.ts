import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';

describe('MoleculeCollectionItemService', () => {
  let service: MoleculeCollectionItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeCollectionItemService,
        {
          provide: getRepositoryToken(MoleculeCollectionItemEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MoleculeCollectionItemService>(MoleculeCollectionItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
