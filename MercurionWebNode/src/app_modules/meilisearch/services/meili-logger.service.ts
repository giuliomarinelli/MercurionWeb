import { Inject, Injectable, Logger, LoggerService, LogLevel, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MeiliSearch } from 'meilisearch';
import { LogEntry } from '../Models/DTO/log-entry.interface';

@Injectable()
export class MeiliLoggerService extends Logger implements LoggerService, OnModuleInit {

    private lastMeiliFailure = 0

    constructor(
        @Inject('MEILISEARCH_CLIENT')
        private readonly meiliClient: MeiliSearch
    ) {
        super()
    }

    async onModuleInit(): Promise<void> {
        await this.ensureIndexExists()
    }

    private async ensureIndexExists(): Promise<void> {
        try {
            await this.meiliClient.getIndex('logs')
        } catch {
            await this.meiliClient.createIndex('logs', { primaryKey: 'id' })
        }
    }

    private async sendToMeili(entry: LogEntry) {
        try {
            await this.meiliClient.index('logs').addDocuments([entry])
        } catch (err) {
            const now = Date.now()
            if (now - this.lastMeiliFailure > 10000) {
                this.lastMeiliFailure = now;
                super.error('[LOGGER] Failed to send log to Meili:', err.message)
            }
        }
    }

    private createLogEntry(level: LogLevel, message: string | object, context?: string, stack?: string): LogEntry {
        return {
            id: `${Date.now()}-${randomUUID()}`,
            timestamp: new Date().toISOString(),
            level,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            context,
            stack
        }
    }

    // sendToMeili => FIRE AND FORGET

    log(message: string | object, context?: string): void {
        super.log(message, context)
        this.sendToMeili(this.createLogEntry('log', message, context))
    }

    error(message: string | object, context?: string, stack?: string) {
        super.error(message, stack, context)
        this.sendToMeili(this.createLogEntry('error', message, context, stack))
    }

    warn(message: string | object, context?: string): void {
        super.warn(message, context);
        this.sendToMeili(this.createLogEntry('warn', message, context))
    }

    debug(message: string | object, context?: string): void {
        super.debug(message, context);
        this.sendToMeili(this.createLogEntry('debug', message, context))
    }

    verbose(message: string | object, context?: string): void {
        super.verbose(message, context);
        this.sendToMeili(this.createLogEntry('verbose', message, context))
    }


}
