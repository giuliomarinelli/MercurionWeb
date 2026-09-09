import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from '../services/authentication.service';
import { MfaService } from '../services/mfa.service';
import { JwtToolsService } from '../services/jwt-tools.service';
import { ResponseService } from 'src/services/response.service';
import { SecureCookieService } from '../services/secure-cookie.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileService } from '../services/turnstile.service';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../services/session.service';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { UnauthorizedException } from '@nestjs/common';
import { EmailDTO } from '../Models/DTO/email.cls.dto';
import { SercurityService } from '../services/sercurity.service';
import { LocalDummyAuthService } from '../services/local-dummy-auth.service';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  const verifyEmailMock = jest.fn();
  const responseOkMock = jest.fn().mockReturnValue({ statusCode: 200, message: 'ok', timestamp: 'now' });
  const destroySessionMock = jest.fn();
  const clearCookieMock = jest.fn();
  const setSignedCookieMock = jest.fn();
  const createLocalSessionMock = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: {
            verifyEmail: verifyEmailMock,
            performAuthentication: jest.fn(),
            onlineUsers: jest.fn(),
            performLogout: jest.fn(),
            performPreAuthenticationForMfa: jest.fn(),
            emailAndPasswordAuthentication: jest.fn(),
            sendForgottenPasswordLink: jest.fn(),
          },
        },
        { provide: MfaService, useValue: {} },
        { provide: JwtToolsService, useValue: {} },
        {
          provide: ResponseService,
          useValue: { ok: responseOkMock },
        },
        {
          provide: SecureCookieService,
          useValue: {
            setSignedCookie: setSignedCookieMock,
            clearCookie: clearCookieMock,
          },
        },
        { provide: UserService, useValue: {} },
        { provide: TurnstileService, useValue: {} },
        { provide: TurnstileGuard, useValue: { canActivate: () => true } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SecureCookie') {
                return {
                  secret: 'secret',
                  sameSite: 'lax',
                  path: '/',
                  httpOnly: true,
                  maxAge: undefined,
                };
              }
              if (key === 'Session.persistentSessionLasting') {
                return 3600;
              }
              return null;
            }),
          },
        },
        {
          provide: SessionService,
          useValue: {
            revokeToken: jest.fn(),
            destroySessionAndRevokeAllTokensBySignedSessionId: destroySessionMock,
          },
        },
        { provide: RedisService, useValue: { get: jest.fn() } },
        { provide: SercurityService, useValue: { signDeviceId: jest.fn((id) => id) } },
        {
          provide: LocalDummyAuthService,
          useValue: {
            acceptsActivationRequest: jest.fn().mockReturnValue(true),
            createAuthenticatedSession: createLocalSessionMock,
          },
        },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates the real local session and writes the signed HttpOnly session cookie', async () => {
    const sessionId = '00000000-0000-4000-8000-000000000102';
    const deviceId = '00000000-0000-4000-8000-000000000103';
    createLocalSessionMock.mockResolvedValue({
      sessionId,
      accessToken: 'signed-access-token',
      ws_accessToken: 'signed-ws-token',
    });
    const reply = { setCookie: jest.fn() };

    const result = await controller.localDummyLogin(
      { headers: {} } as never,
      '127.0.0.1',
      deviceId,
      { browser: { name: 'Chrome' } },
      { system: { platform: 'Windows' } } as never,
      reply as never,
    );

    expect(createLocalSessionMock).toHaveBeenCalledWith(
      deviceId,
      '127.0.0.1',
      expect.any(Object),
      expect.any(Object),
    );
    expect(setSignedCookieMock).toHaveBeenCalledWith(
      reply,
      '__node_session_id',
      sessionId,
      expect.objectContaining({ httpOnly: true, maxAge: 3600 }),
    );
    expect(reply.setCookie).toHaveBeenCalledWith(
      '__logged_in',
      'true',
      expect.objectContaining({ httpOnly: false, maxAge: 3600 }),
    );
    expect(result).toEqual(expect.objectContaining({
      accessToken: 'signed-access-token',
      ws_accessToken: 'signed-ws-token',
      initials: 'LD',
    }));
  });

  describe('login_zeroStep', () => {
    it('returns confirm dto when email is valid', async () => {
      verifyEmailMock.mockResolvedValue(true);
      const dto: EmailDTO = { email: 'user@example.com' };

      const result = await controller.login_zeroStep(dto);

      expect(verifyEmailMock).toHaveBeenCalledWith('user@example.com');
      expect(responseOkMock).toHaveBeenCalledWith('Email successfully verified');
      expect(result).toEqual(responseOkMock.mock.results[0].value);
    });

    it('throws when email is not recognized', async () => {
      verifyEmailMock.mockResolvedValue(false);
      await expect(controller.login_zeroStep({ email: 'ghost@example.com' })).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logoutFromSession', () => {
    const userId = '8e2ea9d8-d8be-45ce-abf4-02e447627e91';
    const targetSessionId = '6f56b64c-ae7f-4a54-b45a-44f72a2fe865';
    const currentSessionId = '9fd8aace-c44f-4cb7-92f6-c6a1bf44c2bb';
    const signedSessionId = `${targetSessionId}.${'a'.repeat(64)}`;

    it('does not clear current session cookie when logging out another session', async () => {
      const reply = {};

      await controller.logoutFromSession(
        userId,
        { signedSessionId },
        currentSessionId,
        reply as never,
      );

      expect(destroySessionMock).toHaveBeenCalledWith(signedSessionId, userId);
      expect(clearCookieMock).not.toHaveBeenCalled();
      expect(responseOkMock).toHaveBeenCalledWith('Action performed successfully');
    });

    it('clears cookies when logging out the current session', async () => {
      const currentSignedSessionId = `${currentSessionId}.${'b'.repeat(64)}`;
      const reply = {};

      await controller.logoutFromSession(
        userId,
        { signedSessionId: currentSignedSessionId },
        currentSessionId,
        reply as never,
      );

      expect(destroySessionMock).toHaveBeenCalledWith(currentSignedSessionId, userId);
      expect(clearCookieMock).toHaveBeenCalledTimes(2);
      expect(clearCookieMock).toHaveBeenNthCalledWith(1, reply, '__node_session_id');
      expect(clearCookieMock).toHaveBeenNthCalledWith(2, reply, '__logged_in');
    });
  });
});
