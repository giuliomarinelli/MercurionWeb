import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  Generated,
} from 'typeorm'
import { Ticket } from './ticket.entity'
import { AuthorType } from '../enums/author-type.enum'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { JsonValue } from 'src/models/json.types'

@Entity({ name: 'ticket_messages' })
@Index('messages_ticket_created_idx', ['ticketId', 'createdAt'])
@Index('messages_user_idx', ['userId', 'createdAt'])
export class TicketMessage {

  @PrimaryColumn('uuid')
  id!: UUID

  @Column({ type: 'bigint', unique: true, name: 'public_id' })
  @Generated('increment')
  publicId!: string

  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId!: UUID

  @ManyToOne(() => Ticket, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket

  @Column({ type: 'varchar', length: 30, name: 'author_type' })
  authorType!: AuthorType

  @Column({ type: 'uuid', name: 'author_id', nullable: true })
  authorId!: UUID | null

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: UUID

  @Column({ type: 'jsonb', name: 'content_delta' })
  contentDelta!: JsonValue | string

  @Column({ type: 'text', name: 'content_html' })
  contentHtml!: string

  @Column({ type: 'bigint', name: 'created_at' })
  createdAt!: string

  @BeforeInsert()
  private onInsert(): void {
    this.id = uuidv7() as UUID
    this.createdAt = String(Date.now())
  }
}
