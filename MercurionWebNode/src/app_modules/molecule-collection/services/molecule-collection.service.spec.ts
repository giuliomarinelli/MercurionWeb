import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionService } from './molecule-collection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { DataSource } from 'typeorm';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('MoleculeCollectionService', () => {
  let service: MoleculeCollectionService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
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
        { provide: DataSource, useValue: { manager: { transaction: jest.fn() } } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<MoleculeCollectionService>(MoleculeCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
