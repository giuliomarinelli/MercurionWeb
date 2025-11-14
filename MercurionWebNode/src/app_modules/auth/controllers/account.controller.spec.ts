import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from '../services/account.service';
import { ResponseService } from 'src/services/response.service';
import { MfaService } from '../services/mfa.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { TurnstileService } from '../services/turnstile.service';
import { SercurityService } from '../services/sercurity.service';
import { SessionService } from '../services/session.service';

describe('AccountController', () => {
  let controller: AccountController;

  beforeEach(async () => {
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
        { provide: SessionService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
