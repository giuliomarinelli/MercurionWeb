import { LogLevel } from "@nestjs/common";

export interface LogEntry {
    id: string
    timestamp: string
    level: LogLevel
    message: string
    context?: string
    stack?: string
}