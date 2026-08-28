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

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: jest.Mocked<AuthenticationService>;
  let responseService: jest.Mocked<ResponseService>;
  let sessionService: jest.Mocked<SessionService>;
  let secureCookieService: jest.Mocked<SecureCookieService>;

  beforeEach(async () => {
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
            verifyEmail: jest.fn(),
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
          useValue: { ok: jest.fn().mockReturnValue({ statusCode: 200, message: 'ok', timestamp: 'now' }) },
        },
        {
          provide: SecureCookieService,
          useValue: {
            setSignedCookie: jest.fn(),
            clearCookie: jest.fn(),
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
            destroySessionAndRevokeAllTokensBySignedSessionId: jest.fn(),
          },
        },
        { provide: RedisService, useValue: { get: jest.fn() } },
        { provide: SercurityService, useValue: { signDeviceId: jest.fn((id) => id) } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get(AuthenticationService);
    responseService = module.get(ResponseService);
    sessionService = module.get(SessionService);
    secureCookieService = module.get(SecureCookieService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login_zeroStep', () => {
    it('returns confirm dto when email is valid', async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue(true);
      const dto: EmailDTO = { email: 'user@example.com' };

      const result = await controller.login_zeroStep(dto);

      expect(authService.verifyEmail).toHaveBeenCalledWith('user@example.com');
      expect(responseService.ok).toHaveBeenCalledWith('Email successfully verified');
      expect(result).toEqual(responseService.ok.mock.results[0].value);
    });

    it('throws when email is not recognized', async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue(false);
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
        userId as never,
        { signedSessionId },
        currentSessionId as never,
        reply as never,
      );

      expect(sessionService.destroySessionAndRevokeAllTokensBySignedSessionId).toHaveBeenCalledWith(signedSessionId, userId);
      expect(secureCookieService.clearCookie).not.toHaveBeenCalled();
      expect(responseService.ok).toHaveBeenCalledWith('Action performed successfully');
    });

    it('clears cookies when logging out the current session', async () => {
      const currentSignedSessionId = `${currentSessionId}.${'b'.repeat(64)}`;
      const reply = {};

      await controller.logoutFromSession(
        userId as never,
        { signedSessionId: currentSignedSessionId },
        currentSessionId as never,
        reply as never,
      );

      expect(sessionService.destroySessionAndRevokeAllTokensBySignedSessionId).toHaveBeenCalledWith(currentSignedSessionId, userId);
      expect(secureCookieService.clearCookie).toHaveBeenCalledTimes(2);
      expect(secureCookieService.clearCookie).toHaveBeenNthCalledWith(1, reply, '__node_session_id');
      expect(secureCookieService.clearCookie).toHaveBeenNthCalledWith(2, reply, '__logged_in');
    });
  });
});
