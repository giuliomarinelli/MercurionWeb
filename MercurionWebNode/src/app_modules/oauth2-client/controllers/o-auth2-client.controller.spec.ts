import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2ClientController } from './o-auth2-client.controller';
import { OAuth2ClientService } from '../services/oauth2-client.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('OAuth2ClientController', () => {
  let controller: OAuth2ClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuth2ClientController],
      providers: [
        { provide: OAuth2ClientService, useValue: { getAuthorizationUrl: jest.fn(), handleCallback: jest.fn() } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    controller = module.get<OAuth2ClientController>(OAuth2ClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
