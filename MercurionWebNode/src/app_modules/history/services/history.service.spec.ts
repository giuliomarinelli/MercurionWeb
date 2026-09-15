import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from './history.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { History } from '../Models/entities/history.entity';
import { DataSource } from 'typeorm';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: getRepositoryToken(History),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn() },
        },
        {
          provide: MoleculeService,
          useValue: {
            getDetailByMolregnos: jest.fn(),
            getDetailByMolregno: jest.fn(),
          },
        },
        {
          provide: LoggerPort,
          useValue: { forContext: jest.fn(() => ({ warn: jest.fn() })) },
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
