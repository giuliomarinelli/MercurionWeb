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
import { ObjectType, Field, ID } from '@nestjs/graphql'
import { Ticket } from './ticket.entity'
import { AuthorType } from '../enums/author-type.enum'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { JsonValue } from 'src/Models/json.types'

@ObjectType()
@Entity({ name: 'ticket_messages' })
@Index('messages_ticket_created_idx', ['ticketId', 'createdAt'])
@Index('messages_user_idx', ['userId', 'createdAt'])
export class TicketMessage {

  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: UUID

  @Field()
  @Column({ type: 'bigint', unique: true, name: 'public_id' })
  @Generated('increment')
  publicId: string

  @Field(() => ID)
  @Column({ type: 'uuid', name: 'ticket_id' })
  ticketId: UUID

  @ManyToOne(() => Ticket, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket

  @Field(() => AuthorType)
  @Column({ type: 'varchar', length: 30, name: 'author_type' })
  authorType: AuthorType

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', name: 'author_id', nullable: true })
  authorId: UUID | null

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: UUID

  @Field(() => String)
  @Column({ type: 'jsonb', name: 'content_delta' })
  contentDelta: JsonValue

  @Field()
  @Column({ type: 'text', name: 'content_html' })
  contentHtml: string

  @Field()
  @Column({ type: 'bigint', name: 'created_at' })
  createdAt: string

  @BeforeInsert()
  private onInsert(): void {
    this.id = uuidv7() as UUID
    this.createdAt = String(Date.now())
  }
}
