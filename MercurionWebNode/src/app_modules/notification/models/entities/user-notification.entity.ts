import { UUID } from 'node:crypto'
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn
} from 'typeorm'

import { User } from '../../../user/models/entities/user.entity'

@Entity({ name: 'user_notifications' })
@Check('ck_user_notifications_version_positive', '"version" > 0')
@Index('idx_user_notifications_recovery', ['recipientUserId', 'revision'])
@Index(
  'idx_user_notifications_active_recent',
  ['recipientUserId', 'createdAt', 'id'],
  { where: '"dismissed_at" IS NULL' }
)
@Index(
  'idx_user_notifications_active_unread',
  ['recipientUserId', 'createdAt', 'id'],
  { where: '"dismissed_at" IS NULL AND "read_at" IS NULL' }
)
@Index(
  'idx_user_notifications_active_unseen',
  ['recipientUserId', 'createdAt', 'id'],
  { where: '"dismissed_at" IS NULL AND "seen_at" IS NULL' }
)
@Index('uq_user_notifications_dedupe', ['dedupeKey'], { unique: true })
export class UserNotification {
  @PrimaryColumn('uuid')
  id!: UUID

  @Column({ type: 'uuid', name: 'recipient_user_id' })
  recipientUserId!: UUID

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User

  @Column({ type: 'varchar', length: 120 })
  type!: string

  @Column({ type: 'integer' })
  version!: number

  @Column({ type: 'varchar', length: 60 })
  category!: string

  @Column({ type: 'varchar', length: 180 })
  title!: string

  @Column({ type: 'varchar', length: 400 })
  summary!: string

  @Column({ type: 'text' })
  body!: string

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>

  @Column({ type: 'varchar', length: 100, name: 'resource_type', nullable: true })
  resourceType!: string | null

  @Column({ type: 'varchar', length: 180, name: 'resource_id', nullable: true })
  resourceId!: string | null

  @Column({ type: 'bigint', name: 'created_at', insert: false, update: false })
  createdAt!: string

  @Column({ type: 'bigint', name: 'updated_at', insert: false, update: false })
  updatedAt!: string

  @Column({ type: 'bigint', name: 'seen_at', nullable: true })
  seenAt!: string | null

  @Column({ type: 'bigint', name: 'read_at', nullable: true })
  readAt!: string | null

  @Column({ type: 'bigint', name: 'dismissed_at', nullable: true })
  dismissedAt!: string | null

  @Column({ type: 'bigint', insert: false, update: false })
  revision!: string

  @Column({ type: 'bigint', name: 'created_revision', insert: false, update: false })
  createdRevision!: string

  @Column({ type: 'varchar', length: 255, name: 'dedupe_key' })
  dedupeKey!: string
}
