import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { UUID } from 'crypto'
import { OutboxEventStatus } from '../enums/outbox-event-status.enum'

@Entity({ name: 'notification_outbox_events' })
@Index('notification_outbox_pending_idx', ['status', 'availableAt'])
export class NotificationOutboxEvent {
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
}
