import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  Index,
  BeforeInsert,
  Generated,
} from 'typeorm'
import { TicketStatus } from '../enums/ticket-status.enum'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { TicketMessage } from './ticket-message.entity'

@Entity({ name: 'tickets' })
@Index('tickets_user_last_idx', ['userId', 'lastMessageAt'])
export class Ticket {

  @PrimaryColumn('uuid')
  id!: UUID

  /**
   * Generato dal DB via identity.
   */
  @Column({ type: 'bigint', unique: true, name: 'public_id' })
  @Generated('increment')
  publicId!: string

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: UUID

  @Column({ type: 'varchar', length: 255 })
  subject!: string

  @Column({
    type: 'varchar',
    length: 30,
    default: TicketStatus.Open,
  })
  status!: TicketStatus

  @Column({ type: 'bigint', name: 'last_message_at' })
  lastMessageAt!: string

  @Column({ type: 'bigint', name: 'created_at' })
  createdAt!: string

  @Column({ type: 'bigint', name: 'updated_at' })
  updatedAt!: string

  @OneToMany(() => TicketMessage, (m) => m.ticket)
  messages?: TicketMessage[]

  @BeforeInsert()
  private onInsert(): void {
    this.id = uuidv7() as UUID
    const now = Date.now()
    this.createdAt = String(now)
    this.updatedAt = String(now)
    this.lastMessageAt = String(now)
  }
}
