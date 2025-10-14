import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionService } from './molecule-collection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';

describe('MoleculeCollectionService', () => {
  let service: MoleculeCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeCollectionService,
        {
          provide: getRepositoryToken(MoleculeCollection),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MoleculeCollectionService>(MoleculeCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
