import { Test, TestingModule } from '@nestjs/testing';

class AppController {
  constructor(private readonly appService: AppService) {}
  getHello(): string {
    return this.appService.getHello();
  }
}

class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useClass: AppService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
