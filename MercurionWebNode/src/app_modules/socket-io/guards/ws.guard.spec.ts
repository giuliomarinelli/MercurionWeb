import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WsGuard } from './ws.guard';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';
import { LoggerPort } from 'src/logging/logger.port';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import { ConfigService } from '@nestjs/config';
import { SecurityService } from 'src/app_modules/auth/services/security.service';
import { applicationError, ApplicationErrorCode } from 'src/exception-handling/application-error';
import { socketEventRegistry } from '@mercurion/socket-contracts';
import type { ExecutionContext } from '@nestjs/common';
import { JwtKeyRuntimeError } from 'src/app_modules/auth/keys/jwt-key-runtime-error';

describe('WsGuard', () => {
  let guard: WsGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsGuard,
        { provide: JwtToolsService, useValue: { verifyTokenAndGetPayload: jest.fn() } },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: SecureCookieService, useValue: { verifyAndParseCookie: jest.fn((value: string) => value) } },
        { provide: ScopeService, useValue: { scopeVerificationLayer: jest.fn(), generateScopesArrayFromJwtClaim: jest.fn() } },
        { provide: SecurityService, useValue: { decryptUserId: jest.fn((encryptedUserId: string) => encryptedUserId) } },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn(() => ({ env: 'development' })) } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    guard = module.get<WsGuard>(WsGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('binds key admission only after normal scope, session and device checks succeed', async () => {
    const client = {
      id: 'socket-a', connected: true, data: {}, rooms: new Set<string>(),
      once: jest.fn(), leave: jest.fn(), disconnect: jest.fn(),
      handshake: { auth: { token: 'verified-token' }, headers: { cookie: '__device_id=device-a; __node_session_id=session-a' } }
    };
    const context = { getType: () => 'ws', getHandler: () => undefined,
      switchToWs: () => ({ getClient: () => client }) } as unknown as ExecutionContext;
    const dependencies = guard as unknown as {
      jwtTools: { verifyTokenAndGetPayload: jest.Mock; watchVerifiedConnection: jest.Mock };
      sessionService: { validateSession: jest.Mock };
    };
    dependencies.jwtTools.verifyTokenAndGetPayload.mockResolvedValue({ sub: 'user-a', sid: 'session-a', scp: 'read' });
    dependencies.jwtTools.watchVerifiedConnection = jest.fn().mockResolvedValue(jest.fn());
    dependencies.sessionService.validateSession = jest.fn().mockResolvedValue(true);

    expect(await guard.canActivate(context)).toBe(true);
    expect(dependencies.sessionService.validateSession).toHaveBeenCalledWith('session-a', 'device-a', 'user-a');
    expect(dependencies.jwtTools.watchVerifiedConnection).toHaveBeenCalledWith('socket-a', 'verified-token', expect.any(Function));
    expect(client.data).toMatchObject({ userId: 'user-a', sessionId: 'session-a' });
  });

  it('offers WS token recovery without invalidating the server session', async () => {
    const emit = jest.fn();
    const disconnect = jest.fn();
    const client = {
      id: 'socket-a',
      handshake: {
        auth: { token: 'expired-ws-token' },
        headers: { cookie: '__device_id=device-a; __node_session_id=session-a' }
      },
      emit,
      disconnect
    };
    const context = {
      getType: () => 'ws',
      getHandler: () => undefined,
      switchToWs: () => ({ getClient: () => client })
    } as unknown as ExecutionContext;
    const verifier = (guard as unknown as { jwtTools: { verifyTokenAndGetPayload: jest.Mock } }).jwtTools;
    verifier.verifyTokenAndGetPayload.mockRejectedValue(
      applicationError(ApplicationErrorCode.TOKEN_INVALID_OR_EXPIRED, 'Expired WS token')
    );

    expect(await guard.canActivate(context)).toBe(false);
    expect(emit).toHaveBeenCalledWith(socketEventRegistry.applicationError.name, expect.anything());
    expect(emit).not.toHaveBeenCalledWith(socketEventRegistry.sessionExpired.name, expect.anything());
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('denies an event during a registry outage without emitting session expiry', async () => {
    const client = {
      id: 'socket-a',
      handshake: { auth: { token: 'synthetic-token' }, headers: { cookie: '__device_id=device-a; __node_session_id=session-a' } },
      emit: jest.fn(), disconnect: jest.fn()
    };
    const context = {
      getType: () => 'ws', getHandler: () => undefined,
      switchToWs: () => ({ getClient: () => client })
    } as unknown as ExecutionContext;
    const verifier = (guard as unknown as { jwtTools: { verifyTokenAndGetPayload: jest.Mock } }).jwtTools;
    verifier.verifyTokenAndGetPayload.mockRejectedValue(new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE'));

    expect(await guard.canActivate(context)).toBe(false);
    expect(client.emit).toHaveBeenCalledWith(socketEventRegistry.applicationError.name, expect.anything());
    expect(client.emit).not.toHaveBeenCalledWith(socketEventRegistry.sessionExpired.name, expect.anything());
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});
