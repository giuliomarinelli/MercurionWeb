import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { WsGuard } from './ws.guard';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { SecureCookieService } from 'src/app_modules/auth/services/secure-cookie.service';

describe('WsGuard', () => {
  let guard: WsGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsGuard,
        { provide: JwtToolsService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: SecureCookieService, useValue: {} },
      ],
    }).compile();

    guard = module.get<WsGuard>(WsGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
