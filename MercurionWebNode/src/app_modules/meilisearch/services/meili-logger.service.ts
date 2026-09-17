import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { LogEntry } from '../models/dto/log-entry.interface';
import { uuidv7 } from '@kripod/uuidv7';
import { LoggerContext, LoggerPort } from 'src/logging/logger.port';
import { utcNow } from 'src/utils/temporal/temporal'
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service'
import { OutboxEventType } from 'src/app_modules/notification/models/enums/outbox-event-type.enum'
import { DataSource } from 'typeorm'
import { runInTransaction } from 'src/persistence/transaction-context'
import { UUID } from 'crypto'
import { redactSensitive } from 'src/observability/redaction'


@Injectable()
export class MeiliLoggerService extends LoggerPort {

    constructor(
        private readonly outbox: NotificationOutboxService,
        private readonly dataSource: DataSource
    ) {
        super()
    }

    private async sendToMeili(entry: LogEntry) {
        try {
            await runInTransaction(this.dataSource, async (_context, manager) => {
              await this.outbox.append(manager, {
                  aggregateId: uuidv7() as UUID,
                  eventType: OutboxEventType.LogRecorded,
                  payload: { indexName: 'logs', document: entry },
                  dedupeKey: `log:${entry.id}`,
                  correlationId: entry.id as UUID
              })
            })
        } catch (error) {
            Logger.error(`[LOGGER_OUTBOX_FAILED] ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    private createLogEntry(level: LogLevel, message: string | object, context?: string, stack?: string): LogEntry {
        const raw = typeof message === 'string'
            ? message
            : JSON.stringify(redactSensitive(message))

        const safeMessage = this.sanitize(raw)
        const safeStack = stack ? this.sanitize(stack) : undefined

        return {
            id: uuidv7(),
            timestamp: utcNow(),
            level,
            message: safeMessage,
            context,
            stack: safeStack
        }
    }

    private sanitize(message: string): string {
        let out = message

        const patterns: RegExp[] = [
            /("password"\s*:\s*")([^"]+)/gi,
            /("accessToken"\s*:\s*")([^"]+)/gi,
            /("ws_accessToken"\s*:\s*")([^"]+)/gi,
            /("token"\s*:\s*")([^"]+)/gi,
            /("otp"\s*:\s*")([^"]+)/gi,
            /("totp"\s*:\s*")([^"]+)/gi,
            /("email"\s*:\s*")([^"]+)/gi,
            /("phone"\s*:\s*")([^"]+)/gi
        ]

        for (const re of patterns) {
            out = out.replace(re, '$1***redacted***')
        }

        return out
    }

    public forContext(context: string): LoggerContext {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const logger = this
        return {
            log(...messages: (string | object)[]) {
                for (const message of messages) {
                    void logger.log(message, context)
                }
            },
            error(message: string | object, stack?: string) {
                void logger.error(message, context, stack)
            },
            warn(...messages: (string | object)[]) {
                for (const message of messages) {
                    void logger.warn(message, context)
                }
            },
            debug(...messages: (string | object)[]) {
                for (const message of messages) {
                    void logger.debug(message, context)
                }
            },
            verbose(...messages: (string | object)[]) {
                for (const message of messages) {
                    void logger.verbose(message, context)
                }
            },
            fatal(...messages: (string | object)[]) {
                for (const message of messages) {
                    void logger.fatal(message, context)
                }
            },
            setLogLevels(levels: LogLevel[]) {
                logger.setLogLevels(levels)
            }
        }
    }


    public override log(message: string | object, context?: string): void {
        super.log(message, context)
        void this.sendToMeili(this.createLogEntry('log', message, context))
    }

    public override error(message: string | object, context?: string, stack?: string) {
        super.error(message, stack, context)
        void this.sendToMeili(this.createLogEntry('error', message, context, stack))
    }

    public override warn(message: string | object, context?: string): void {
        super.warn(message, context)
        void this.sendToMeili(this.createLogEntry('warn', message, context))
    }

    public override debug(message: string | object, context?: string): void {
        super.debug(message, context)
        void this.sendToMeili(this.createLogEntry('debug', message, context))
    }

    public override verbose(message: string | object, context?: string): void {
        super.verbose(message, context)
        void this.sendToMeili(this.createLogEntry('verbose', message, context))
    }

    public override fatal(message: string | object, context?: string): void {
        super.fatal(message, context)
        void this.sendToMeili(this.createLogEntry('fatal', message, context))
    }

    public setLogLevels(levels: LogLevel[]): void {
        Logger.overrideLogger(levels)
    }

}
