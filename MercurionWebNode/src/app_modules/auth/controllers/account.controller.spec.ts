import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from '../services/account.service';
import { ResponseService } from 'src/services/response.service';
import { MfaService } from '../services/mfa.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { TurnstileService } from '../services/turnstile.service';
import { SercurityService } from '../services/sercurity.service';
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
        { provide: AccountService, useValue: {} },
        { provide: ResponseService, useValue: {} },
        { provide: MfaService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: TurnstileGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
        { provide: TurnstileService, useValue: {} },
        { provide: SercurityService, useValue: { maskEmail: jest.fn() } },
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
