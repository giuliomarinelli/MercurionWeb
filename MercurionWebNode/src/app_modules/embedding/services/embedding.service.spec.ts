import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingService } from './embedding.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity';
import { DataSource } from 'typeorm';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: getRepositoryToken(MoleculeEmbedding),
          useValue: {
            findOne: jest.fn(),
            query: jest.fn(),
          },
        },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
