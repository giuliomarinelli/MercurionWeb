import { TestBed } from '@angular/core/testing';
import { LoggerService, redactSensitiveData } from './logger.service';
import { APP_CONFIG, AppConfig, createAppConfig } from '../config/app-config';
import { environment as developmentEnvironment } from '../../environments/environment.development';

describe('LoggerService', () => {
  let debugSpy: jasmine.Spy;
  let infoSpy: jasmine.Spy;
  let warnSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;

  function createTestConfig(minLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'off'): AppConfig {
    const base = createAppConfig(developmentEnvironment);
    return {
      ...base,
      logging: { minLevel: minLogLevel }
    };
  }

  beforeEach(() => {
    debugSpy = spyOn(console, 'debug');
    infoSpy = spyOn(console, 'info');
    warnSpy = spyOn(console, 'warn');
    errorSpy = spyOn(console, 'error');
  });

  describe('Level Gating', () => {
    it('emits all log levels when minLevel is debug', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: APP_CONFIG, useValue: createTestConfig('debug') },
          LoggerService
        ]
      });

      const logger = TestBed.inject(LoggerService);

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(debugSpy).toHaveBeenCalledWith('debug msg');
      expect(infoSpy).toHaveBeenCalledWith('info msg');
      expect(warnSpy).toHaveBeenCalledWith('warn msg');
      expect(errorSpy).toHaveBeenCalledWith('error msg');
    });

    it('suppresses debug and info when minLevel is warn', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: APP_CONFIG, useValue: createTestConfig('warn') },
          LoggerService
        ]
      });

      const logger = TestBed.inject(LoggerService);

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('warn msg');
      expect(errorSpy).toHaveBeenCalledWith('error msg');
    });

    it('suppresses all output when minLevel is off', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: APP_CONFIG, useValue: createTestConfig('off') },
          LoggerService
        ]
      });

      const logger = TestBed.inject(LoggerService);

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Sensitive Data Redaction', () => {
    it('redacts sensitive keys in metadata objects', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: APP_CONFIG, useValue: createTestConfig('info') },
          LoggerService
        ]
      });

      const logger = TestBed.inject(LoggerService);

      logger.info('User action', {
        userId: '123',
        authToken: 'secret-token-123',
        password: 'my-password',
        sessionToken: 'session-xyz',
        nested: {
          apiKey: 'key-abc',
          safeField: 'hello'
        }
      });

      expect(infoSpy).toHaveBeenCalledWith('User action', {
        userId: '123',
        authToken: '[REDACTED]',
        password: '[REDACTED]',
        sessionToken: '[REDACTED]',
        nested: {
          apiKey: '[REDACTED]',
          safeField: 'hello'
        }
      });
    });

    it('redacts Bearer and JWT token strings', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const bearer = `Bearer ${jwt}`;

      expect(redactSensitiveData(jwt)).toBe('[REDACTED]');
      expect(redactSensitiveData(bearer)).toBe('[REDACTED]');
      expect(redactSensitiveData('normal string')).toBe('normal string');
    });

    it('handles cyclic references safely', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj['self'] = obj;

      const redacted = redactSensitiveData(obj) as Record<string, unknown>;
      expect(redacted['name']).toBe('test');
      expect(redacted['self']).toBe('[CIRCULAR]');
    });

    it('preserves error details while redacting sensitive properties', () => {
      const customError = new Error('Database connection failed for user secret-user') as Error & { code?: string; status?: number };
      customError.code = 'DB_CONN_FAIL';
      customError.status = 500;

      const redacted = redactSensitiveData(customError) as Record<string, unknown>;
      expect(redacted['name']).toBe('Error');
      expect(redacted['message']).toBe('Database connection failed for user secret-user');
      expect(redacted['code']).toBe('DB_CONN_FAIL');
      expect(redacted['status']).toBe(500);
    });
  });

  describe('Fault Tolerance', () => {
    it('does not throw when console throws an exception', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: APP_CONFIG, useValue: createTestConfig('error') },
          LoggerService
        ]
      });

      errorSpy.and.throwError(new Error('Console unavailable'));
      const logger = TestBed.inject(LoggerService);

      expect(() => logger.error('Test message')).not.toThrow();
    });
  });
});
