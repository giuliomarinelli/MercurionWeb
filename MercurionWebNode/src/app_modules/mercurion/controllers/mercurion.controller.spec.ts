import { Test, TestingModule } from '@nestjs/testing';
import { MercurionController } from './mercurion.controller';
import { MercurionService } from '../services/mercurion.service';

describe('MercurionController', () => {
  let controller: MercurionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercurionController],
      providers: [{ provide: MercurionService, useValue: {} }],
    }).compile();

    controller = module.get<MercurionController>(MercurionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
