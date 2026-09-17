import { Field, ID, ObjectType } from '@nestjs/graphql'
import { UUID } from 'crypto'
import {
  MessagePublicId,
  TicketPublicId,
} from '../value-objects/help-public-id'
import { AuthorType } from '../enums/author-type.enum'
import { TicketStatus } from '../enums/ticket-status.enum'

/**
 * API views for Help are deliberately separate from the mutable TypeORM
 * entities.  A response is constructed by a presenter and is never reused as
 * persistence state.
 */
@ObjectType('TicketMessage')
export class TicketMessageResponse {
  @Field(() => ID)
  readonly id!: UUID

  @Field()
  readonly publicId!: MessagePublicId

  @Field(() => ID)
  readonly ticketId!: UUID

  @Field(() => AuthorType)
  readonly authorType!: AuthorType

  @Field(() => ID, { nullable: true })
  readonly authorId!: UUID | null | undefined

  @Field(() => String, { nullable: true })
  readonly authorFullName!: string | undefined

  @Field(() => ID, { nullable: true })
  readonly userId!: UUID | null | undefined

  @Field(() => String, { nullable: true })
  readonly userFullName!: string | undefined

  @Field(() => String)
  readonly contentDelta!: string

  @Field()
  readonly contentHtml!: string

  @Field()
  readonly createdAt!: string
}

@ObjectType('Ticket')
export class TicketResponse {
  @Field(() => ID)
  readonly id!: UUID

  @Field()
  readonly publicId!: TicketPublicId

  @Field(() => ID, { nullable: true })
  readonly userId!: UUID | null | undefined

  @Field(() => String, { nullable: true })
  readonly userFullName!: string | undefined

  @Field()
  readonly subject!: string

  @Field(() => TicketStatus)
  readonly status!: TicketStatus

  @Field()
  readonly lastMessageAt!: string

  @Field()
  readonly createdAt!: string

  @Field()
  readonly updatedAt!: string

  @Field(() => [TicketMessageResponse], { nullable: true })
  readonly messages!: TicketMessageResponse[] | undefined
}
