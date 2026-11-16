import { Injectable } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { NotificationOutboxEvent } from '../../models/entities/notification-outbox-event.entity'
import { OutboxEventStatus } from '../../models/enums/outbox-event-status.enum'
import { OutboxEventType } from '../../models/enums/outbox-event-type.enum'
import type { EmailTemplateKey } from '../../email-template-registry'

export const OUTBOX_MAX_ATTEMPTS = 5

@Injectable()
export class NotificationOutboxService {
  async appendEmail(
    manager: EntityManager,
    input: {
      aggregateId: UUID
      templateKey: EmailTemplateKey
      to: string
      context: Record<string, unknown>
      dedupeKey: string
      correlationId?: UUID
      causationId?: UUID
    }
  ): Promise<NotificationOutboxEvent> {
    return this.append(manager, {
      aggregateId: input.aggregateId,
      eventType: OutboxEventType.EmailSend,
      payload: {
        templateKey: input.templateKey,
        to: input.to,
        context: input.context
      },
      dedupeKey: input.dedupeKey,
      correlationId: input.correlationId,
      causationId: input.causationId
    })
  }

  async appendNotificationStateChanged(
    manager: EntityManager,
    input: {
      recipientUserId: UUID
      dedupeKey: string
      correlationId?: UUID
      causationId?: UUID
    }
  ): Promise<NotificationOutboxEvent> {
    return this.append(manager, {
      aggregateId: input.recipientUserId,
      eventType: OutboxEventType.NotificationStateChanged,
      payload: {
        recipientUserId: input.recipientUserId
      },
      dedupeKey: input.dedupeKey,
      correlationId: input.correlationId,
      causationId: input.causationId
    })
  }

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
    const id = uuidv7() as UUID

    const inserted = await manager.query(
      [
        'INSERT INTO outbox_events (',
        '  id, aggregate_id, event_type, version, payload, status, attempt_count,',
        '  available_at, created_at, claimed_at, claimed_by, processed_at,',
        '  last_error, dedupe_key, correlation_id, causation_id, occurred_at',
        ') VALUES (',
        '  $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13,',
        '  $14, $15, $16, $17',
        ')',
        'ON CONFLICT (dedupe_key) DO NOTHING',
        'RETURNING id'
      ].join('\n'),
      [
        id,
        input.aggregateId,
        input.eventType,
        1,
        JSON.stringify(input.payload),
        OutboxEventStatus.Pending,
        0,
        String(now),
        String(now),
        null,
        null,
        null,
        null,
        input.dedupeKey,
        input.correlationId ?? null,
        input.causationId ?? null,
        String(now)
      ]
    ) as Array<{ id: UUID }>

    const repository = manager.getRepository(NotificationOutboxEvent)
    if (inserted[0]?.id) {
      return repository.findOneByOrFail({ id: inserted[0].id })
    }

    return repository.findOneByOrFail({
      dedupeKey: input.dedupeKey
    })
  }
}
