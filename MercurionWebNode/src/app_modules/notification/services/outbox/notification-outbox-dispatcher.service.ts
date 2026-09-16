import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'node:crypto'
import { UUID } from 'node:crypto'
import { NotificationOutboxEvent } from '../../models/entities/notification-outbox-event.entity'
import { OutboxEventStatus } from '../../models/enums/outbox-event-status.enum'
import { HelpNotificationEventType } from '../../models/enums/help-notification-event-type.enum'
import { MailSenderService } from '../mail-sender/mail-sender.service'
import { Ticket } from '../../../help/models/entities/ticket.entity'
import { TicketMessage } from '../../../help/models/entities/ticket-message.entity'
import { formatHelpPublicId } from '../../../help/models/value-objects/help-public-id'
import { OUTBOX_MAX_ATTEMPTS } from './notification-outbox.service'
import { runInTransaction } from '../../../../persistence/transaction-context'
import { LoggerContext, LoggerPort } from '../../../../logging/logger.port'
import { errorMessage, errorStack } from '../../../../utils/errors/error-message'

const POLL_MS = 1_000
const CLAIM_TIMEOUT_MS = 60_000

@Injectable()
export class NotificationOutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly workerId = randomUUID()
  private readonly logger: LoggerContext
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationOutboxEvent)
    private readonly repo: Repository<NotificationOutboxEvent>,
    private readonly mailer: MailSenderService,
    loggerFactory: LoggerPort,
  ) {
    this.logger = loggerFactory.forContext(NotificationOutboxDispatcherService.name)
  }

  async onModuleInit(): Promise<void> {
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
      const event = await this.claimNext()
      if (!event) return false
      try {
        await this.deliver(event)
        await this.repo.update(event.id, {
          status: OutboxEventStatus.Succeeded,
          processedAt: String(Date.now()),
          claimedAt: null,
          claimedBy: null,
          lastError: null
        })
      } catch (error) {
        await this.recordFailure(event, error)
      }
      return true
    } finally {
      this.running = false
    }
  }

  private async dispatchScheduled(): Promise<void> {
    try {
      await this.dispatchOnce()
    } catch (error) {
      this.logger.error(
        `[NOTIFICATION_OUTBOX_DISPATCH_FAILED] ${errorMessage(error)}`,
        errorStack(error)
      )
    }
  }

  private async claimNext(): Promise<NotificationOutboxEvent | null> {
    return runInTransaction(this.dataSource, async (_context, manager) => {
      const now = Date.now()
      const stale = String(now - CLAIM_TIMEOUT_MS)
      const rows = await manager.query(
        `SELECT id FROM notification_outbox_events
         WHERE (status = $1 AND available_at <= $2)
            OR (status = $3 AND claimed_at < $4)
         ORDER BY available_at, created_at
         FOR UPDATE SKIP LOCKED LIMIT 1`,
        [OutboxEventStatus.Pending, String(now), OutboxEventStatus.Processing, stale]
      )
      if (!rows[0]) return null
      await manager.query(
        `UPDATE notification_outbox_events
         SET status = $1, claimed_at = $2, claimed_by = $3, attempt_count = attempt_count + 1
         WHERE id = $4`,
        [OutboxEventStatus.Processing, String(now), this.workerId, rows[0].id]
      )
      return manager.getRepository(NotificationOutboxEvent).findOneBy({ id: rows[0].id })
    })
  }

  private async deliver(event: NotificationOutboxEvent): Promise<void> {
    const payload = event.payload
    const ticket = await this.dataSource.getRepository(Ticket).findOneByOrFail({ id: payload.ticketId as UUID })
    const messageRepository: Repository<TicketMessage> = this.dataSource.getRepository(TicketMessage)
    const message = payload.messageId
      ? await (messageRepository.findOneByOrFail as (criteria: object) => Promise<TicketMessage>)({ id: payload.messageId })
      : null
    const ticketPublicId = formatHelpPublicId(ticket.publicId, 'Ticket')
    const eventType = event.eventType as HelpNotificationEventType
    switch (eventType) {
      case HelpNotificationEventType.TicketOpenedSupport:
        await this.mailer.notifySupportNewTicket(ticket, message!, ticketPublicId, event.id)
        return
      case HelpNotificationEventType.TicketOpenedUser:
        await this.mailer.confirmUserTicketOpened(ticket, message!, ticketPublicId, event.id)
        return
      case HelpNotificationEventType.UserMessageAdded:
        await this.mailer.notifySupportNewMessage(ticket, message!, ticketPublicId, event.id)
        return
      case HelpNotificationEventType.SupportReplied:
        await this.mailer.notifyUserSupportReplied(ticket, payload.userId as UUID, ticketPublicId, event.id)
        return
      default:
        throw new Error(`Unsupported notification outbox event: ${event.eventType}`)
    }
  }

  private async recordFailure(event: NotificationOutboxEvent, error: unknown): Promise<void> {
    const attempt = event.attemptCount
    const terminal = attempt >= OUTBOX_MAX_ATTEMPTS
    const delay = Math.min(60_000, 1_000 * (2 ** Math.max(0, attempt - 1)))
    await this.repo.update(event.id, {
      status: terminal ? OutboxEventStatus.DeadLetter : OutboxEventStatus.Pending,
      availableAt: String(Date.now() + delay),
      claimedAt: null,
      claimedBy: null,
      lastError: error instanceof Error ? error.stack ?? error.message : String(error)
    })
  }
}
