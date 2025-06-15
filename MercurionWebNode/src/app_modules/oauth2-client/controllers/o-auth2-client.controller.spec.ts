import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2ClientController } from './o-auth2-client.controller';

describe('OAuth2ClientController', () => {
  let controller: OAuth2ClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuth2ClientController],
    }).compile();

    controller = module.get<OAuth2ClientController>(OAuth2ClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
