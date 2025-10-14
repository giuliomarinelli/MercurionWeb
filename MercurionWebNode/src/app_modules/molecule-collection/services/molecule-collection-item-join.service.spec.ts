import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity';

describe('MoleculeCollectionItemJoinService', () => {
  let service: MoleculeCollectionItemJoinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeCollectionItemJoinService,
        {
          provide: getRepositoryToken(MoleculeCollectionItemJoin),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MoleculeCollectionItemJoinService>(MoleculeCollectionItemJoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
