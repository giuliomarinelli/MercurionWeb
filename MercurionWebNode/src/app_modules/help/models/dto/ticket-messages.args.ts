import { ArgsType, Field, ID } from '@nestjs/graphql'
import { IsString } from 'class-validator'
import { UUID } from 'crypto'
import { PaginationArgs } from 'src/models/pagination/pagination.args'

@ArgsType()
export class TicketMessagesArgs extends PaginationArgs {
  @Field(() => ID)
  @IsString()
  ticketId!: UUID
}
