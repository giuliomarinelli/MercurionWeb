import { Test, TestingModule } from '@nestjs/testing';
import { TestController } from './test.controller';
import { ResponseService } from './services/response.service';

describe('TestController', () => {
  let controller: TestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [{ provide: ResponseService, useValue: {} }],
    }).compile();

    controller = module.get<TestController>(TestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
