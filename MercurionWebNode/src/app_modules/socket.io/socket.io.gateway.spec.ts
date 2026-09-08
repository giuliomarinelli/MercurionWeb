import { Test, TestingModule } from '@nestjs/testing';
import {
  SocketIOGateway,
  createSocketContractVersionMiddleware
} from './socket.io.gateway';
import { PubSubService } from '../redis/services/pub-sub.service';
import { WsGuard } from './guards/ws.guard';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { Reflector } from '@nestjs/core';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ConfigService } from '@nestjs/config';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';

describe('SocketGateway', () => {
  let gateway: SocketIOGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketIOGateway,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue({ host: 'localhost', port: 6379 }) } },
        { provide: PubSubService, useValue: { setSocketServer: jest.fn() } },
        WsGuard,
        { provide: JwtToolsService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: SecureCookieService, useValue: {} },
        { provide: ScopeService, useValue: { scopeVerificationLayer: jest.fn(), generateScopesArrayFromJwtClaim: jest.fn() } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    gateway = module.get<SocketIOGateway>(SocketIOGateway);
  });

  it('should create the gateway with required services', () => {
    expect(gateway).toBeInstanceOf(SocketIOGateway);
  });

  it('accepts and records the declared Socket.IO contract major', () => {
    const logger = { warn: jest.fn() }
    const middleware = createSocketContractVersionMiddleware(logger)
    const client = {
      id: 'socket-supported',
      handshake: { auth: { contractMajor: 1 } },
      data: {}
    }
    const next = jest.fn()

    middleware(client as never, next)

    expect(client.data).toEqual({ contractMajor: 1 })
    expect(next).toHaveBeenCalledWith()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('rejects an unsupported Socket.IO contract major with connect-error data', () => {
    const middleware = createSocketContractVersionMiddleware({ warn: jest.fn() })
    let receivedError: (Error & { data?: unknown }) | undefined
    const next = (error?: Error) => {
      receivedError = error
    }

    middleware({
      id: 'socket-unsupported',
      handshake: { auth: { contractMajor: 2 } },
      data: {}
    } as never, next)

    expect(receivedError?.message).toBe('Unsupported contract major version')
    expect(receivedError?.data).toMatchObject({
      code: 'CONTRACT_VERSION_UNSUPPORTED',
      status: 400,
      details: { selectedMajor: 2, currentMajor: 1 }
    })
  })

  it('warns while accepting a missing Socket.IO contract declaration during rollout', () => {
    const logger = { warn: jest.fn() }
    const middleware = createSocketContractVersionMiddleware(logger)
    const next = jest.fn()

    middleware({
      id: 'socket-legacy',
      handshake: { auth: {} },
      data: {}
    } as never, next)

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('legacy-unversioned'))
    expect(next).toHaveBeenCalledWith()
  })
});
