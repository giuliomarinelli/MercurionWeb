import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { MoleculeEmbedding } from '../models/entities/molecule-embedding.entity'
import { EmbeddingService } from './embedding.service'

describe('EmbeddingService', () => {
  let service: EmbeddingService
  let repository: {
    findOne: jest.Mock
    query: jest.Mock
  }

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      query: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: getRepositoryToken(MoleculeEmbedding),
          useValue: repository,
        },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile()

    service = module.get<EmbeddingService>(EmbeddingService)
  })

  it('returns no live analogs when the canonical SMILES has no embedding seed', async () => {
    repository.findOne.mockResolvedValue(null)

    await expect(service.getSimilarBySmiles('CCO', 3, 'false')).resolves.toEqual([])

    expect(repository.query).not.toHaveBeenCalled()
  })

  it('reuses the ANN search for a canonical SMILES seed', async () => {
    repository.findOne.mockResolvedValue({
      molregno: 10,
      embedding: [0.1, 0.2, 0.3],
    })
    repository.query.mockResolvedValue([
      { molregno: 20, distance: 0.1 },
      { molregno: 30, distance: 0.2 },
      { molregno: 40, distance: 0.3 },
    ])

    await expect(service.getSimilarBySmiles('CCO', 3, 'false')).resolves.toEqual([
      { molregno: 20, distance: 0.1 },
      { molregno: 30, distance: 0.2 },
      { molregno: 40, distance: 0.3 },
    ])

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { smiles: 'CCO' },
      select: ['molregno', 'embedding'],
    })
    expect(repository.query).toHaveBeenCalledWith(
      expect.stringContaining('preferred_name IS NOT NULL'),
      [[0.1, 0.2, 0.3], 10, expect.any(Number)],
    )
  })
})
