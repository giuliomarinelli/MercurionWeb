import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity';
import { DataSource } from 'typeorm';
import { MoleculeCollectionService } from './molecule-collection.service';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('MoleculeCollectionItemJoinService', () => {
  let service: MoleculeCollectionItemJoinService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
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
            manager: { transaction: jest.fn() },
          },
        },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: MoleculeCollectionService, useValue: {} },
        { provide: MoleculeCollectionItemService, useValue: {} },
        { provide: MoleculeService, useValue: {} },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<MoleculeCollectionItemJoinService>(MoleculeCollectionItemJoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
