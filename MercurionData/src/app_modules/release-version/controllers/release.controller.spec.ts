import { ReleaseService } from '../services/release.service'
import { Test, TestingModule } from '@nestjs/testing'
import { ReleaseController } from './release.controller'

describe('ReleaseController', () => {
  let controller: ReleaseController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReleaseController],
      providers: [
        { provide: ReleaseService, useValue: {} },
      ],
    }).compile()

    controller = module.get<ReleaseController>(ReleaseController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
