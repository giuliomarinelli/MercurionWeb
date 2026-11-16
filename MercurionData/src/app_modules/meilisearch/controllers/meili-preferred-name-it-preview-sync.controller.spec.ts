import { MeiliPreferredNameItPreviewSyncService } from '../services/meili-preferred-name-it-preview.service'
import { Test, TestingModule } from '@nestjs/testing'
import { MeiliPreferredNameItPreviewSyncController } from './meili-preferred-name-it-preview-sync.controller'

describe('MeiliPreferredNameItPreviewSyncController', () => {
  let controller: MeiliPreferredNameItPreviewSyncController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeiliPreferredNameItPreviewSyncController],
      providers: [
        { provide: MeiliPreferredNameItPreviewSyncService, useValue: {} },
      ],
    }).compile()

    controller = module.get<MeiliPreferredNameItPreviewSyncController>(MeiliPreferredNameItPreviewSyncController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
