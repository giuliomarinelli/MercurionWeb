import { Test, TestingModule } from '@nestjs/testing';
import { SocketIOGateway } from './socket.io.gateway';
import { PubSubService } from '../redis/services/pub-sub.service';
import { WsGuard } from './guards/ws.guard';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { Reflector } from '@nestjs/core';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('SocketGateway', () => {
  let gateway: SocketIOGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketIOGateway,
        { provide: PubSubService, useValue: { setSocketServer: jest.fn() } },
        WsGuard,
        { provide: JwtToolsService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: SecureCookieService, useValue: {} },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    gateway = module.get<SocketIOGateway>(SocketIOGateway);
  });

  it('should create the gateway with required services', () => {
    expect(gateway).toBeInstanceOf(SocketIOGateway);
  });
});
