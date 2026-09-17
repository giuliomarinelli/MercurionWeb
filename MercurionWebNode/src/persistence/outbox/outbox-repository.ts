import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { randomUUID } from 'node:crypto'
import { NotificationOutboxEvent } from '../../app_modules/notification/models/entities/notification-outbox-event.entity'
import { OutboxEventStatus } from '../../app_modules/notification/models/enums/outbox-event-status.enum'
import { OutboxMetricsService } from './outbox-metrics.service'
import { runInTransaction } from '../transaction-context'

export const OUTBOX_MAX_ATTEMPTS = 5
export const OUTBOX_LEASE_MS = 60_000
export const OUTBOX_BATCH_SIZE = 25

@Injectable()
export class OutboxRepository {
  private readonly workerId = randomUUID()

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotificationOutboxEvent)
    private readonly repository: Repository<NotificationOutboxEvent>,
    private readonly metrics: OutboxMetricsService
  ) {}

  append(
    manager: EntityManager,
    event: NotificationOutboxEvent
  ): Promise<NotificationOutboxEvent> {
    return manager.save(event)
  }

  async claimBatch(): Promise<NotificationOutboxEvent[]> {
    return runInTransaction(this.dataSource, async (_context, manager) => {
      const now = Date.now()
      const stale = String(now - OUTBOX_LEASE_MS)
      const rows = await manager.query(
        `SELECT id FROM outbox_events
         WHERE (status = $1 AND available_at <= $2)
            OR (status = $3 AND claimed_at < $4)
         ORDER BY available_at, created_at
         FOR UPDATE SKIP LOCKED LIMIT $5`,
        [
          OutboxEventStatus.Pending,
          String(now),
          OutboxEventStatus.Processing,
          stale,
          OUTBOX_BATCH_SIZE
        ]
      )
      if (!rows.length) {
        this.metrics.setBacklog(0)
        return []
      }

      const ids = rows.map((row: { id: string }) => row.id)
      await manager.query(
        `UPDATE outbox_events
         SET status = $1, claimed_at = $2, claimed_by = $3, attempt_count = attempt_count + 1
         WHERE id = ANY($4::uuid[])`,
        [OutboxEventStatus.Processing, String(now), this.workerId, ids]
      )
      const events = await manager.getRepository(NotificationOutboxEvent)
        .createQueryBuilder('event')
        .where('event.id IN (:...ids)', { ids })
        .getMany()
      this.metrics.setBacklog(events.length, Math.min(...events.map(event => Number(event.createdAt))))
      return events
    })
  }

  async succeed(event: NotificationOutboxEvent): Promise<void> {
    await this.repository.update(event.id, {
      status: OutboxEventStatus.Succeeded,
      processedAt: String(Date.now()),
      claimedAt: null,
      claimedBy: null,
      lastError: null
    })
  }

  async fail(event: NotificationOutboxEvent, error: unknown): Promise<void> {
    const terminal = event.attemptCount >= OUTBOX_MAX_ATTEMPTS
    const delay = Math.min(60_000, 1_000 * (2 ** Math.max(0, event.attemptCount - 1)))
    await this.repository.update(event.id, {
      status: terminal ? OutboxEventStatus.DeadLetter : OutboxEventStatus.Pending,
      availableAt: String(Date.now() + delay),
      claimedAt: null,
      claimedBy: null,
      lastError: error instanceof Error ? error.stack ?? error.message : String(error)
    })
    if (terminal) this.metrics.recordTerminalFailure()
  }

  async requeue(id: string): Promise<void> {
    await this.repository.update(id, {
      status: OutboxEventStatus.Pending,
      availableAt: String(Date.now()),
      claimedAt: null,
      claimedBy: null,
      lastError: null
    })
  }

  async getMetrics(): Promise<ReturnType<OutboxMetricsService['getSnapshot']>> {
    const [row] = await this.repository.query(
      `SELECT COUNT(*)::int AS pending,
              COALESCE(EXTRACT(EPOCH FROM (NOW() - TO_TIMESTAMP(MIN(created_at) / 1000))) * 1000, 0)::bigint AS oldest_age
       FROM outbox_events
       WHERE status IN ($1, $2)`,
      [OutboxEventStatus.Pending, OutboxEventStatus.Processing]
    )
    this.metrics.setBacklog(Number(row?.pending ?? 0))
    return this.metrics.getSnapshot()
  }
}
