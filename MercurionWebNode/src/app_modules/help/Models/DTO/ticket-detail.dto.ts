import { Field, ObjectType } from "@nestjs/graphql";
import { TicketMessage } from "../entities/ticket-message.entity";
import { Ticket } from "../entities/ticket.entity";

@ObjectType()
export class TicketDetailDTO {
  @Field(() => Ticket)
  ticket: Ticket 

  @Field(() => [TicketMessage], { nullable: true })
  messages?: TicketMessage[] | null
}
