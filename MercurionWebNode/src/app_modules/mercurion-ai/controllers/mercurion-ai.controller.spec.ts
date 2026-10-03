import { Test, TestingModule } from '@nestjs/testing';
import { MercurionAIController } from './mercurion-ai.controller';
import { MercurionAIService } from '../services/mercurion-ai.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';

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

  it('exposes Tox21 inference publicly', () => {
    const handler = Object.getOwnPropertyDescriptor(MercurionAIController.prototype, 'inferTox21Top4Smiles')?.value;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });
});
