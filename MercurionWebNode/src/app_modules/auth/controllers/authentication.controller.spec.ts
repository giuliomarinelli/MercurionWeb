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

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: jest.Mocked<AuthenticationService>;
  let responseService: jest.Mocked<ResponseService>;

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
        { provide: SessionService, useValue: { revokeToken: jest.fn() } },
        { provide: RedisService, useValue: { get: jest.fn() } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get(AuthenticationService);
    responseService = module.get(ResponseService);
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
});
