import { RecoveryController } from './recovery.controller';
import { AccountRecoveryUseCase } from '../application/account-recovery.use-case';
import { SecureCookieService } from '../services/secure-cookie.service';
import { ConfigService } from '@nestjs/config';
import { ResponseService } from 'src/services/response.service';

describe('RecoveryController', () => {
  it('should be defined', () => {
    const controller = new RecoveryController(
      {} as unknown as AccountRecoveryUseCase,
      {} as unknown as SecureCookieService,
      {
        get: jest.fn().mockReturnValue({
          secret: 'secret',
          sameSite: 'lax',
          httpOnly: true,
          path: '/',
        }),
      } as unknown as ConfigService,
      {} as unknown as ResponseService,
    );
    expect(controller).toBeDefined();
  });
});
