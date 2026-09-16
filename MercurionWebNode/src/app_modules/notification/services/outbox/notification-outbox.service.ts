import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { NotificationOutboxEvent } from '../../models/entities/notification-outbox-event.entity'
import { OutboxEventStatus } from '../../models/enums/outbox-event-status.enum'

export const OUTBOX_MAX_ATTEMPTS = 5

@Injectable()
export class NotificationOutboxService {
  async append(
    manager: EntityManager,
    input: {
      aggregateId: UUID
      eventType: string
      payload: Record<string, unknown>
      dedupeKey: string
      now?: number
    }
  ): Promise<NotificationOutboxEvent> {
    const now = input.now ?? Date.now()
    const event = manager.create(NotificationOutboxEvent, {
      id: uuidv7() as UUID,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      version: 1,
      payload: input.payload,
      status: OutboxEventStatus.Pending,
      attemptCount: 0,
      availableAt: String(now),
      createdAt: String(now),
      claimedAt: null,
      claimedBy: null,
      processedAt: null,
      lastError: null,
      dedupeKey: input.dedupeKey
    })
    return manager.save(event)
  }
}
