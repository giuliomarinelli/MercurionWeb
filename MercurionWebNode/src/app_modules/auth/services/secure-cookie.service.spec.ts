import { Test, TestingModule } from '@nestjs/testing';
import { SecureCookieService } from './secure-cookie.service';
import { ConfigService } from '@nestjs/config';
import { LoggerPort } from 'src/logging/logger.port';

describe('SecureCookieService', () => {
  let service: SecureCookieService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecureCookieService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue({
          secret: 'test-secret',
          httpOnly: true,
          sameSite: 'lax',
        }) } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<SecureCookieService>(SecureCookieService);
  });

  it('round-trips signed cookie values', () => {
    const signed = service.signCookie('session-123');

    expect(service.verifyAndParseCookie(signed)).toBe('session-123');
  });

  it('rejects tampered and missing cookie values', () => {
    expect(() => service.verifyAndParseCookie('session-123.invalid')).toThrow();
    expect(() => service.getSignedCookie({ cookies: {} } as any, 'session')).toThrow();
  });
});
