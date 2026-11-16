import { UUID } from 'crypto'
import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { StorageOperationStatus } from '../enums/storage-operation-status.enum'
import { StorageOperationType } from '../enums/storage-operation-type.enum'

@Entity({ name: 'storage_operations' })
@Index('storage_operations_due_idx', ['status', 'nextAttemptAt'])
export class StorageOperationEntity {
  @PrimaryColumn('uuid')
  id!: UUID

  @Column({ type: 'uuid', nullable: true, name: 'document_id' })
  documentId!: UUID | null

  @Column({ type: 'varchar', length: 30 })
  type!: StorageOperationType

  @Column({ type: 'varchar', length: 1024, name: 'object_key' })
  objectKey!: string

  @Column({ type: 'varchar', length: 30 })
  status!: StorageOperationStatus

  @Column({ type: 'integer', name: 'attempt_count', default: 0 })
  attemptCount!: number

  @Column({ type: 'bigint', name: 'next_attempt_at' })
  nextAttemptAt!: string

  @Column({ type: 'bigint', name: 'created_at' })
  createdAt!: string

  @Column({ type: 'bigint', name: 'completed_at', nullable: true })
  completedAt!: string | null

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, name: 'dedupe_key' })
  dedupeKey!: string
}
