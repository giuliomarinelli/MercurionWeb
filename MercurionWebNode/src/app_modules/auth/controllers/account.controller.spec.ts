import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from '../services/account.service';
import { ResponseService } from 'src/services/response.service';
import { MfaService } from '../services/mfa.service';
import { UserService } from 'src/app_modules/user/services/user.service'; // <--- importa il servizio mancante

describe('AccountController', () => {
  let controller: AccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: AccountService, useValue: {} },
        { provide: ResponseService, useValue: {} },
        { provide: MfaService, useValue: {} },
        { provide: UserService, useValue: {} }, // <--- aggiungi questo
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
