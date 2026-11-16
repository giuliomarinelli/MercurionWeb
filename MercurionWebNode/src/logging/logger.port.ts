import { Logger, LoggerService, LogLevel } from '@nestjs/common'

export interface LoggerContext extends LoggerService {
  log(...messages: (string | object)[]): void
  error(message: string | object, stack?: string): void
  warn(...messages: (string | object)[]): void
  debug(...messages: (string | object)[]): void
  verbose(...messages: (string | object)[]): void
  fatal(...messages: (string | object)[]): void
  setLogLevels(levels: LogLevel[]): void
}

/**
 * Application-owned logging contract. Infrastructure adapters implement this
 * port; application modules must not depend on a particular log sink.
 */
export abstract class LoggerPort extends Logger implements LoggerService {
  abstract forContext(context: string): LoggerContext

  setLogLevels(levels: LogLevel[]): void {
    Logger.overrideLogger(levels)
  }
}
