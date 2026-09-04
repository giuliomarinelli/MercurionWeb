import { Injectable, inject } from '@angular/core';
import { APP_CONFIG, LogLevel } from '../config/app-config';


const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  off: 4
};

const SENSITIVE_KEY_PATTERNS = [
  /token/i,
  /password/i,
  /pass/i,
  /pwd/i,
  /secret/i,
  /authorization/i,
  /auth/i,
  /cookie/i,
  /session/i,
  /credential/i,
  /apiKey/i,
  /api_key/i,
  /creditCard/i,
  /cvv/i,
  /ssn/i,
  /bearer/i
];

const BEARER_OR_JWT_PATTERN = /^Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/i;
const JWT_PATTERN = /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;

export function redactSensitiveData(val: unknown, seen = new WeakSet<object>()): unknown {
  if (val === null || val === undefined) {
    return val;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (BEARER_OR_JWT_PATTERN.test(trimmed) || JWT_PATTERN.test(trimmed)) {
      return '[REDACTED]';
    }
    return val;
  }

  if (typeof val !== 'object' && typeof val !== 'function') {
    return val;
  }

  if (typeof val === 'object') {
    if (seen.has(val)) {
      return '[CIRCULAR]';
    }
    seen.add(val);

    if (Array.isArray(val)) {
      return val.map(item => redactSensitiveData(item, seen));
    }

    if (val instanceof Error) {
      const errObj: Record<string, unknown> = {
        name: val.name,
        message: redactSensitiveData(val.message, seen)
      };
      if ('code' in val) errObj['code'] = (val as Record<string, unknown>)['code'];
      if ('status' in val) errObj['status'] = (val as Record<string, unknown>)['status'];
      if ('kind' in val) errObj['kind'] = (val as Record<string, unknown>)['kind'];
      if (val.stack) errObj['stack'] = val.stack;
      return errObj;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(val)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
      const value = (val as Record<string, unknown>)[key];
      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitiveData(value, seen);
      }
    }
    return result;
  }

  return val;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly appConfig = inject(APP_CONFIG);

  private isLevelEnabled(level: LogLevel): boolean {
    const configuredMinLevel = this.appConfig.logging?.minLevel ?? 'warn';
    const reqSeverity = LOG_LEVEL_SEVERITY[level] ?? 4;
    const minSeverity = LOG_LEVEL_SEVERITY[configuredMinLevel] ?? 2;
    return reqSeverity >= minSeverity;
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    try {
      const redactedMessage = redactSensitiveData(message) as string;
      const redactedArgs = args.map(arg => redactSensitiveData(arg));

      switch (level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(redactedMessage, ...redactedArgs);
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(redactedMessage, ...redactedArgs);
          break;
        case 'warn':
          // eslint-disable-next-line no-console
          console.warn(redactedMessage, ...redactedArgs);
          break;
        case 'error':
          // eslint-disable-next-line no-console
          console.error(redactedMessage, ...redactedArgs);
          break;
      }
    } catch {
      // Logging failures must never interrupt application execution
    }
  }
}

