import { Test, TestingModule } from '@nestjs/testing';
import { MercurionAIController } from './mercurion-ai.controller';
import { MercurionAIService } from '../services/mercurion-ai.service';

describe('MercurionController', () => {
  let controller: MercurionAIController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MercurionAIController],
      providers: [{ provide: MercurionAIService, useValue: {} }],
    }).compile();

    controller = module.get<MercurionAIController>(MercurionAIController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
