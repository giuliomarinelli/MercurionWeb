import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountRegistrationUseCase } from '../application/account-registration.use-case';
import { AccountActivationUseCase, AccountEmailAvailabilityQuery } from '../application/account-registration.use-case';
import { AccountSensitiveDataUseCase } from '../application/account-sensitive-data.use-case';
import { PasswordChangeUseCase, PasswordRecoveryUseCase } from '../application/password-recovery.use-case';
import { ProfileAccountUseCase } from '../application/profile-account.use-case';
import { ResponseService } from 'src/services/response.service';
import { MfaChallengeService } from '../services/mfa-challenge.service';
import { MfaEnrollmentService } from '../services/mfa-enrollment.service';
import { MfaBackupCodeService } from '../services/mfa-backup-code.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { TurnstileService } from '../services/turnstile.service';
import { SecurityService } from '../services/security.service';
import { ListActiveSessionsHandler } from '../application/session-authentication.handlers';
import { ConfigService } from '@nestjs/config';

describe('AccountController', () => {
  let controller: AccountController;
  const listActiveSessions = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: AccountRegistrationUseCase, useValue: {} },
        { provide: AccountActivationUseCase, useValue: {} },
        { provide: AccountEmailAvailabilityQuery, useValue: {} },
        { provide: AccountSensitiveDataUseCase, useValue: {} },
        { provide: PasswordChangeUseCase, useValue: {} },
        { provide: PasswordRecoveryUseCase, useValue: {} },
        { provide: ProfileAccountUseCase, useValue: {} },
        { provide: ResponseService, useValue: {} },
        { provide: MfaChallengeService, useValue: {} },
        { provide: MfaEnrollmentService, useValue: {} },
        { provide: MfaBackupCodeService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: TurnstileGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
        { provide: TurnstileService, useValue: {} },
        { provide: SecurityService, useValue: { maskEmail: jest.fn() } },
        { provide: ListActiveSessionsHandler, useValue: listActiveSessions },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('maps active-session lookup to one typed query handler', async () => {
    const sessions = [{ sessionId: 'session' }];
    listActiveSessions.execute.mockResolvedValue(sessions);

    await expect(controller.getActiveSessions(
      '00000000-0000-4000-8000-000000000601',
      '00000000-0000-4000-8000-000000000602',
    )).resolves.toBe(sessions);
    expect(listActiveSessions.execute).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000601',
      currentSessionId: '00000000-0000-4000-8000-000000000602',
    });
  });
});
