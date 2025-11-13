import { Inject, Injectable, Logger, LoggerService, LogLevel, OnModuleInit } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import { LogEntry } from '../Models/DTO/log-entry.interface';
import { uuidv7 } from '@kripod/uuidv7';


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
        const raw = typeof message === 'string' ? message : JSON.stringify(message)

        const safeMessage = this.sanitize(raw)
        const safeStack = stack ? this.sanitize(stack) : undefined

        return {
            id: uuidv7(),
            timestamp: new Date().toISOString(),
            level,
            message: safeMessage,
            context,
            stack: safeStack
        }
    }

    private sanitize(message: string): string {
        let out = message

        const patterns: RegExp[] = [
            /("password"\\s*:\s*")([^"]+)/gi,
            /(password=)([^&\s]+)/gi,

            /("accessToken"\\s*:\s*")([^"]+)/gi,
            /("ws_accessToken"\\s*:\s*")([^"]+)/gi,
            /("token"\\s*:\s*")([^"]+)/gi,

            /("otp"\\s*:\s*")([^"]+)/gi,
            /("totp"\\s*:\s*")([^"]+)/gi,

            /("email"\\s*:\s*")([^"]+)/gi,
            /("phone"\\s*:\s*")([^"]+)/gi
        ]

        for (const re of patterns) {
            out = out.replace(re, '$1***redacted***')
        }

        return out
    }

    public forContext(context: string): LoggerService {
        return {
            log(message: string | object) {
                this.log(message, context)
            },
            error(message: string | object, stack?: string) {
                this.error(message, context, stack)
            },
            warn(message: string | object) {
                this.warn(message, context)
            },
            debug(message: string | object) {
                this.debug(message, context)
            },
            verbose(message: string | object) {
                this.verbose(message, context)
            },
            fatal(message: string | object) {
                this.fatal(message, context)
            },
            setLogLevels(levels: LogLevel[]) {
                this.setLogLevels(levels)
            }
        }
    }


    public override log(message: string | object, context?: string): void {
        super.log(message, context)
        this.sendToMeili(this.createLogEntry('log', message, context))
    }

    public override error(message: string | object, context?: string, stack?: string) {
        super.error(message, stack, context)
        this.sendToMeili(this.createLogEntry('error', message, context, stack))
    }

    public override warn(message: string | object, context?: string): void {
        super.warn(message, context)
        this.sendToMeili(this.createLogEntry('warn', message, context))
    }

    public override debug(message: string | object, context?: string): void {
        super.debug(message, context)
        this.sendToMeili(this.createLogEntry('debug', message, context))
    }

    public override verbose(message: string | object, context?: string): void {
        super.verbose(message, context)
        this.sendToMeili(this.createLogEntry('verbose', message, context))
    }

    public override fatal(message: string | object, context?: string): void {
        super.fatal(message, context)
        this.sendToMeili(this.createLogEntry('fatal', message, context))
    }

}
