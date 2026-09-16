import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { NotificationOutboxEvent } from '../../models/entities/notification-outbox-event.entity'
import { OutboxEventStatus } from '../../models/enums/outbox-event-status.enum'
import { OutboxEventType } from '../../models/enums/outbox-event-type.enum'

export const OUTBOX_MAX_ATTEMPTS = 5

@Injectable()
export class NotificationOutboxService {
  async appendMeilisearchUpsert(
    manager: EntityManager,
    input: {
      aggregateId: UUID
      indexName: string
      document: Record<string, unknown>
      dedupeKey: string
      correlationId?: UUID
      causationId?: UUID
    }
  ): Promise<NotificationOutboxEvent> {
    return this.append(manager, {
      aggregateId: input.aggregateId,
      eventType: OutboxEventType.MeilisearchUpsert,
      payload: { indexName: input.indexName, document: input.document },
      dedupeKey: input.dedupeKey,
      correlationId: input.correlationId,
      causationId: input.causationId
    })
  }

  async appendMeilisearchDelete(
    manager: EntityManager,
    input: {
      aggregateId: UUID
      indexName: string
      documentId: string
      dedupeKey: string
      correlationId?: UUID
      causationId?: UUID
    }
  ): Promise<NotificationOutboxEvent> {
    return this.append(manager, {
      aggregateId: input.aggregateId,
      eventType: OutboxEventType.MeilisearchDelete,
      payload: {
        indexName: input.indexName,
        documentId: input.documentId
      },
      dedupeKey: input.dedupeKey,
      correlationId: input.correlationId,
      causationId: input.causationId
    })
  }

  async append(
    manager: EntityManager,
    input: {
      aggregateId: UUID
      eventType: OutboxEventType | string
      payload: Record<string, unknown>
      dedupeKey: string
      now?: number
      correlationId?: UUID
      causationId?: UUID
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
      dedupeKey: input.dedupeKey,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
      occurredAt: String(now)
    })
    try {
      return await manager.save(event)
    } catch (error) {
      if (!String(error).toLowerCase().includes('dedupe')) throw error
      const existing = await manager.findOneBy(NotificationOutboxEvent, {
        dedupeKey: input.dedupeKey
      })
      if (!existing) throw error
      return existing
    }
  }
}
