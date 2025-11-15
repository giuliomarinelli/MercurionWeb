import { LoggerService, LogLevel } from '@nestjs/common'

export interface MeiliContextLogger extends LoggerService {
    log(...messages: (string | object)[]): void
    error(message: string | object, stack?: string): void
    warn(...messages: (string | object)[]): void
    debug(...messages: (string | object)[]): void
    verbose(...messages: (string | object)[]): void
    fatal(...messages: (string | object)[]): void
    setLogLevels(levels: LogLevel[]): void
}
