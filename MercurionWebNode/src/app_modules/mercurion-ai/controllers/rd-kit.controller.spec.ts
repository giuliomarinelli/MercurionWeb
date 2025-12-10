import { Test, TestingModule } from '@nestjs/testing';
import { RdKitController } from './rd-kit.controller';

describe('RdKitController', () => {
  let controller: RdKitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RdKitController],
    }).compile();

    controller = module.get<RdKitController>(RdKitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
