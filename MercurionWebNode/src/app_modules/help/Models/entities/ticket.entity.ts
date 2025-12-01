import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  Index,
  BeforeInsert,
} from 'typeorm'
import { ObjectType, Field, ID } from '@nestjs/graphql'
import { TicketStatus } from '../enums/ticket-status.enum'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { TicketMessage } from './ticket-message.entity'

@ObjectType()
@Entity({ name: 'tickets' })
@Index('tickets_user_last_idx', ['userId', 'lastMessageAt'])
export class Ticket {

  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: UUID

  /**
   * Generato dal DB via identity.
   * insert:false/update:false per evitare che TypeORM provi a settarlo.
   */
  @Field()
  @Column({ type: 'bigint', unique: true, insert: false, update: false, name: 'public_id' })
  publicId: string

  @Field()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: UUID

  @Field()
  @Column({ type: 'varchar', length: 255 })
  subject: string

  @Field(() => TicketStatus)
  @Column({
    type: 'varchar',
    length: 30,
    default: TicketStatus.Open,
  })
  status: TicketStatus

  @Field()
  @Column({ type: 'bigint', name: 'last_message_at' })
  lastMessageAt: string

  @Field()
  @Column({ type: 'bigint', name: 'created_at' })
  createdAt: string

  @Field()
  @Column({ type: 'bigint', name: 'updated_at' })
  updatedAt: string

  @Field(() => [TicketMessage], { nullable: true })
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
