import { JwtHelperService } from './jwt-helper.service';
import { LoggerService } from './logger.service';
import { TestBed } from '@angular/core/testing';

describe('JwtHelperService', () => {
  let service: JwtHelperService;
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);
    TestBed.configureTestingModule({
      providers: [JwtHelperService, { provide: LoggerService, useValue: logger }],
    });
    service = TestBed.inject(JwtHelperService);
  });

  it('decodes claims and reads named values', () => {
    const token = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMiLCJyb2xlIjoidXNlciJ9.';

    expect(service.decodeToken(token)).toEqual(jasmine.objectContaining({ sub: '123', role: 'user' }));
    expect(service.getClaim<string>(token, 'role')).toBe('user');
    expect(service.getClaim(token, 'missing')).toBeNull();
  });

  it('returns safe failure values for malformed tokens', () => {
    expect(service.decodeToken('not-a-token')).toBeNull();
    expect(service.getClaim('not-a-token', 'sub')).toBeNull();
    expect(service.isTokenExpired('not-a-token')).toBeTrue();
    expect(logger.error).toHaveBeenCalled();
  });
});
