import { Test, TestingModule } from '@nestjs/testing';
import { PreferredNameTranslationController } from './preferred-name-translation.controller';

describe('PreferredNameTranslationController', () => {
  let controller: PreferredNameTranslationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferredNameTranslationController],
    }).compile();

    controller = module.get<PreferredNameTranslationController>(PreferredNameTranslationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
