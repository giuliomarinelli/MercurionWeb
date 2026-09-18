import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MeiliSearch } from 'meilisearch'
import { UUID } from 'node:crypto'
import { NotificationOutboxEvent } from '../../models/entities/notification-outbox-event.entity'
import { OutboxEventType } from '../../models/enums/outbox-event-type.enum'
import { HelpNotificationEventType } from '../../models/enums/help-notification-event-type.enum'
import { MailSenderService } from '../mail-sender/mail-sender.service'
import { Ticket } from '../../../help/models/entities/ticket.entity'
import { TicketMessage } from '../../../help/models/entities/ticket-message.entity'
import { formatHelpPublicId } from '../../../help/models/value-objects/help-public-id'
import { OutboxConsumerRegistry } from '../../../../persistence/outbox/outbox-consumer-registry'
import { OutboxRepository } from '../../../../persistence/outbox/outbox-repository'
import { OutboxEventEnvelope } from '../../../../persistence/outbox/outbox-event-envelope'
import { OutboxMetricsService } from '../../../../persistence/outbox/outbox-metrics.service'
import { LoggerContext, LoggerPort } from '../../../../logging/logger.port'
import { errorMessage, errorStack } from '../../../../utils/errors/error-message'

const POLL_MS = 1_000

type OutboxPayload = Record<string, unknown>

@Injectable()
export class NotificationOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: LoggerContext
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(
    private readonly dataSource: DataSource,
    private readonly mailer: MailSenderService,
    @Inject('MEILISEARCH_CLIENT')
    private readonly meiliClient: MeiliSearch,
    private readonly registry: OutboxConsumerRegistry,
    private readonly outbox: OutboxRepository,
    private readonly metrics: OutboxMetricsService,
    loggerFactory: LoggerPort
  ) {
    this.logger = loggerFactory.forContext(NotificationOutboxDispatcherService.name)
  }

  async onModuleInit(): Promise<void> {
    this.registerConsumers()
    await this.dispatchOnce()
    this.timer = setInterval(() => {
      void this.dispatchScheduled()
    }, POLL_MS)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    while (this.running) await new Promise(resolve => setTimeout(resolve, 10))
  }

  async dispatchOnce(): Promise<boolean> {
    if (this.running) return false
    this.running = true
    try {
      const events = await this.outbox.claimBatch()
      for (const event of events) {
        await this.dispatchEvent(event)
      }
      return events.length > 0
    } finally {
      this.running = false
    }
  }

  private async dispatchEvent(event: NotificationOutboxEvent): Promise<void> {
    const consumer = this.registry.resolve(event.eventType, event.version)
    if (!consumer) {
      await this.outbox.fail(event, new Error(`No outbox consumer for ${event.eventType}:v${event.version}`))
      return
    }

    const startedAt = Date.now()
    this.metrics.recordAttempt()
    try {
      await consumer(this.toEnvelope(event))
      await this.outbox.succeed(event)
      this.metrics.recordConsumerLatency(startedAt)
    } catch (error) {
      await this.outbox.fail(event, error)
      this.logger.warn(
        `[OUTBOX_CONSUMER_FAILED] event=${event.id} type=${event.eventType} error=${errorMessage(error)}`,
        errorStack(error) ?? ''
      )
    }
  }

  private registerConsumers(): void {
    for (const eventType of [
      OutboxEventType.MeilisearchUpsert,
      OutboxEventType.SecurityAuditRecorded,
      OutboxEventType.LogRecorded
    ]) {
      this.registry.register(eventType, 1, event => this.deliverIndexUpsert(event))
    }
    this.registry.register(OutboxEventType.MeilisearchDelete, 1, event => this.deliverIndexDelete(event))
    this.registry.register(OutboxEventType.EmailSend, 1, event => this.deliverEmail(event))
    this.registry.register(HelpNotificationEventType.TicketOpenedSupport, 1, event => this.deliverHelpMail(event))
    this.registry.register(HelpNotificationEventType.TicketOpenedUser, 1, event => this.deliverHelpMail(event))
    this.registry.register(HelpNotificationEventType.UserMessageAdded, 1, event => this.deliverHelpMail(event))
    this.registry.register(HelpNotificationEventType.SupportReplied, 1, event => this.deliverHelpMail(event))
  }

  private async deliverIndexUpsert(event: OutboxEventEnvelope<OutboxPayload>): Promise<void> {
    const payload = event.payload
    await this.meiliClient.index(String(payload.indexName)).addDocuments(
      [payload.document as Record<string, unknown>],
      { primaryKey: typeof payload.primaryKey === 'string' ? payload.primaryKey : 'id' }
    )
  }

  private async deliverIndexDelete(event: OutboxEventEnvelope<OutboxPayload>): Promise<void> {
    const payload = event.payload
    await this.meiliClient.index(String(payload.indexName)).deleteDocument(String(payload.documentId))
  }

  private async deliverEmail(event: OutboxEventEnvelope<OutboxPayload>): Promise<void> {
    const payload = event.payload
    await this.mailer.send(
      payload.templateKey as Parameters<MailSenderService['send']>[0],
      String(payload.to),
      payload.context as Parameters<MailSenderService['send']>[2],
      event.id
    )
  }

  private async deliverHelpMail(event: OutboxEventEnvelope<OutboxPayload>): Promise<void> {
    const payload = event.payload
    const ticket = await this.dataSource.getRepository(Ticket).findOneByOrFail({ id: payload.ticketId as UUID })
    const messageRepository = this.dataSource.getRepository(TicketMessage)
    const message = payload.messageId
      ? await (messageRepository.findOneByOrFail as (criteria: object) => Promise<TicketMessage>)({
        id: payload.messageId as UUID
      })
      : null
    const ticketPublicId = formatHelpPublicId(ticket.publicId, 'Ticket')
    const handlers: Record<string, () => Promise<void>> = {
      [HelpNotificationEventType.TicketOpenedSupport]: () =>
        this.mailer.notifySupportNewTicket(ticket, message!, ticketPublicId, event.id),
      [HelpNotificationEventType.TicketOpenedUser]: () =>
        this.mailer.confirmUserTicketOpened(ticket, message!, ticketPublicId, event.id),
      [HelpNotificationEventType.UserMessageAdded]: () =>
        this.mailer.notifySupportNewMessage(ticket, message!, ticketPublicId, event.id),
      [HelpNotificationEventType.SupportReplied]: () =>
        this.mailer.notifyUserSupportReplied(ticket, payload.userId as UUID, ticketPublicId, event.id)
    }
    const handler = handlers[event.eventType]
    if (!handler) throw new Error(`Unsupported notification outbox event: ${event.eventType}`)
    await handler()
  }

  private toEnvelope(event: NotificationOutboxEvent): OutboxEventEnvelope {
    return {
      id: event.id,
      eventType: event.eventType,
      version: event.version,
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      payload: event.payload,
      occurredAt: event.occurredAt,
      createdAt: event.createdAt,
      availableAt: event.availableAt,
      attemptCount: event.attemptCount,
      state: event.status,
      claimedAt: event.claimedAt,
      claimedBy: event.claimedBy,
      processedAt: event.processedAt,
      lastError: event.lastError
    }
  }

  private async dispatchScheduled(): Promise<void> {
    try {
      await this.dispatchOnce()
    } catch (error) {
      this.logger.error(
        `[OUTBOX_DISPATCH_FAILED] ${errorMessage(error)}`,
        errorStack(error)
      )
    }
  }
}
