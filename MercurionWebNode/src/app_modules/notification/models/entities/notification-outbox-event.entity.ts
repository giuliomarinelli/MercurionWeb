import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { UUID } from 'crypto'
import { OutboxEventStatus } from '../enums/outbox-event-status.enum'

@Entity({ name: 'outbox_events' })
@Index('outbox_pending_idx', ['status', 'availableAt'])
@Index('outbox_dispatch_idx', ['status', 'availableAt', 'claimedAt'])
export class OutboxEvent {
  @PrimaryColumn('uuid')
  id!: UUID

  @Column({ type: 'uuid', name: 'aggregate_id' })
  aggregateId!: UUID

  @Column({ type: 'varchar', length: 120, name: 'event_type' })
  eventType!: string

  @Column({ type: 'integer' })
  version!: number

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>

  @Column({ type: 'varchar', length: 30 })
  status!: OutboxEventStatus

  @Column({ type: 'integer', name: 'attempt_count', default: 0 })
  attemptCount!: number

  @Column({ type: 'bigint', name: 'available_at' })
  availableAt!: string

  @Column({ type: 'bigint', name: 'created_at' })
  createdAt!: string

  @Column({ type: 'bigint', name: 'claimed_at', nullable: true })
  claimedAt!: string | null

  @Column({ type: 'varchar', length: 120, name: 'claimed_by', nullable: true })
  claimedBy!: string | null

  @Column({ type: 'bigint', name: 'processed_at', nullable: true })
  processedAt!: string | null

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null

  @Column({ type: 'varchar', length: 255, name: 'dedupe_key', unique: true })
  dedupeKey!: string

  @Column({ type: 'uuid', name: 'correlation_id', nullable: true })
  correlationId!: UUID | null

  @Column({ type: 'uuid', name: 'causation_id', nullable: true })
  causationId!: UUID | null

  @Column({ type: 'bigint', name: 'occurred_at' })
  occurredAt!: string
}

/**
 * Compatibility name for domain modules migrated by DATA-009 and DATA-029.
 * Persistence remains owned by the shared outbox boundary.
 */
export { OutboxEvent as NotificationOutboxEvent }
