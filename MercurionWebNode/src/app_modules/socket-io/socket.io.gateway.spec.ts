import { Test, TestingModule } from '@nestjs/testing';
import {
  SocketIOGateway,
  createSocketContractVersionMiddleware
} from './socket.io.gateway';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { PubSubService } from '../redis/services/pub-sub.service';
import { WsGuard } from './guards/ws.guard';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { Reflector } from '@nestjs/core';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { LoggerPort } from 'src/logging/logger.port';
import { ConfigService } from '@nestjs/config';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import { SecurityService } from 'src/app_modules/auth/services/security.service';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(),
}));

describe('SocketGateway', () => {
  let gateway: SocketIOGateway;
  let setSocketServer: jest.Mock;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();
    setSocketServer = jest.fn();

    moduleRef = await Test.createTestingModule({
      providers: [
        SocketIOGateway,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue({ host: 'localhost', port: 6379 }) } },
        { provide: PubSubService, useValue: { setSocketServer } },
        WsGuard,
        { provide: JwtToolsService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: SecureCookieService, useValue: {} },
        { provide: ScopeService, useValue: { scopeVerificationLayer: jest.fn(), generateScopesArrayFromJwtClaim: jest.fn() } },
        { provide: SecurityService, useValue: { decryptUserId: jest.fn((encryptedUserId: string) => encryptedUserId) } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    gateway = moduleRef.get<SocketIOGateway>(SocketIOGateway);
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('should create the gateway with required services', () => {
    expect(gateway).toBeInstanceOf(SocketIOGateway);
  });

  it('registers middleware, Redis adapter, and PubSub binding only once', () => {
    const subClient = {};
    const pubClient = {
      duplicate: jest.fn().mockReturnValue(subClient),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    (subClient as { quit?: jest.Mock }).quit = jest.fn().mockResolvedValue('OK');
    const redisAdapter = jest.fn();
    const use = jest.fn();
    const adapter = jest.fn();
    const server = { use, adapter };

    (Redis as unknown as jest.Mock).mockImplementation(() => pubClient);
    (createAdapter as jest.MockedFunction<typeof createAdapter>).mockReturnValue(redisAdapter);

    gateway.afterInit(server as never);
    gateway.afterInit(server as never);

    expect(use).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledWith(expect.any(Function));
    expect(Redis).toHaveBeenCalledTimes(1);
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      password: undefined,
    });
    expect(pubClient.duplicate).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledWith(pubClient, subClient);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledWith(redisAdapter);
    expect(setSocketServer).toHaveBeenCalledTimes(1);
    expect(setSocketServer).toHaveBeenCalledWith(server);
  });

  it('keeps Redis adapter clients alive until application shutdown', async () => {
    const subClient = {
      status: 'ready',
      quit: jest.fn().mockResolvedValue('OK')
    };
    const pubClient = {
      status: 'ready',
      duplicate: jest.fn().mockReturnValue(subClient),
      quit: jest.fn().mockResolvedValue('OK')
    };
    const server = { use: jest.fn(), adapter: jest.fn() };

    (Redis as unknown as jest.Mock).mockImplementation(() => pubClient);
    gateway.afterInit(server as never);

    expect(pubClient.quit).not.toHaveBeenCalled();
    expect(subClient.quit).not.toHaveBeenCalled();

    await gateway.onApplicationShutdown();

    expect(pubClient.quit).toHaveBeenCalledTimes(1);
    expect(subClient.quit).toHaveBeenCalledTimes(1);
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
