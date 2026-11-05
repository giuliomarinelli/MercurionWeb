import { EmbeddingSyncStreamService } from '../services/embedding-sync-stream.service'
import { PreferredNameSyncService } from '../services/preferred-name-backfill.service'
import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingSyncController } from './embedding-sync.controller'

describe('EmbeddingSyncController', () => {
  let controller: EmbeddingSyncController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmbeddingSyncController],
      providers: [
        { provide: EmbeddingSyncStreamService, useValue: {} },
        { provide: PreferredNameSyncService, useValue: {} },
      ],
    }).compile()

    controller = module.get<EmbeddingSyncController>(EmbeddingSyncController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
