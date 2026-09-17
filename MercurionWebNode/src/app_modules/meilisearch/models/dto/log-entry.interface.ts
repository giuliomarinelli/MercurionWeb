import { LogLevel } from "@nestjs/common";
import type { UtcInstant } from '@mercurion/rest-contracts'

export interface LogEntry {
    id: string
    timestamp: UtcInstant
    level: LogLevel
    message: string
    context?: string
    stack?: string
}