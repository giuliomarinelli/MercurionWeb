import { RecoveryController } from './recovery.controller';
import { AccountService } from '../services/account.service';
import { SecureCookieService } from '../services/secure-cookie.service';
import { ConfigService } from '@nestjs/config';
import { ResponseService } from 'src/services/response.service';

describe('RecoveryController', () => {
  it('should be defined', () => {
    const controller = new RecoveryController(
      {} as unknown as AccountService,
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
