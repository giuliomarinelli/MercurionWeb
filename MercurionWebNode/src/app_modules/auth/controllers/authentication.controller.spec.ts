import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from '../services/authentication.service';
import { MfaService } from '../services/mfa.service';
import { JwtToolsService } from '../services/jwt-tools.service';
import { ResponseService } from 'src/services/response.service';
import { SecureCookieService } from '../services/secure-cookie.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileService } from '../services/turnstile.service'; // <-- aggiungi l'import
import { TurnstileGuard } from '../guards/turnstile.guard'; // <-- se serve

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: {} },
        { provide: MfaService, useValue: {} },
        { provide: JwtToolsService, useValue: {} },
        { provide: ResponseService, useValue: {} },
        { provide: SecureCookieService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: TurnstileService, useValue: {} }, // <-- AGGIUNGI QUESTO!
        { provide: TurnstileGuard, useValue: { canActivate: () => true } }, // <-- opzionale, se richiesto dai decorator
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
