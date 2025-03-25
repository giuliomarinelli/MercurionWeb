import { Test, TestingModule } from '@nestjs/testing';
import { MercurionController } from './mercurion.controller';

describe('MercurionController', () => {
  let controller: MercurionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercurionController],
    }).compile();

    controller = module.get<MercurionController>(MercurionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
