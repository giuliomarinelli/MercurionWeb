import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GlobalGuard } from './global.guard';
import { JwtToolsService } from '../services/jwt-tools.service';
import { SessionService } from '../services/session.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ScopeService } from '../services/scope.service';
import { SecureCookieService } from '../services/secure-cookie.service';

describe('GlobalGuard', () => {
  let guard: GlobalGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalGuard,
        { provide: JwtToolsService, useValue: {} },
        { provide: SessionService, useValue: {} },
        { provide: Reflector, useValue: { get: jest.fn() } },
        { provide: ScopeService, useValue: { scopeVerificationLayer: jest.fn() } },
        { provide: SecureCookieService, useValue: {} },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    guard = module.get<GlobalGuard>(GlobalGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
