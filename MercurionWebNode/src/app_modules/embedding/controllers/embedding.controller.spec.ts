import { Test, TestingModule } from '@nestjs/testing'

import { EmbeddingService } from '../services/embedding.service'
import { EmbeddingController } from './embedding.controller'

describe('EmbeddingController', () => {
  let controller: EmbeddingController
  let service: {
    getSimilarBySmiles: jest.Mock
  }

  beforeEach(async () => {
    service = {
      getSimilarBySmiles: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmbeddingController],
      providers: [{ provide: EmbeddingService, useValue: service }],
    }).compile()

    controller = module.get<EmbeddingController>(EmbeddingController)
  })

  it('maps SMILES analog results to molregnos when requested', async () => {
    service.getSimilarBySmiles.mockResolvedValue([
      { molregno: 11, distance: 0.1 },
      { molregno: 22, distance: 0.2 },
    ])

    await expect(
      controller.getSimilarBySmiles(
        { smiles: 'CCO' },
        3,
        true,
        false,
      ),
    ).resolves.toEqual([11, 22])

    expect(service.getSimilarBySmiles).toHaveBeenCalledWith('CCO', 3, 'false')
  })
})
