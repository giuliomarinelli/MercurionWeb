import { Field, ObjectType } from "@nestjs/graphql"
import { TicketMessage } from "../entities/ticket-message.entity"
import { Ticket } from "../entities/ticket.entity"

@ObjectType()
export class TicketDetailDTO {
    @Field()
    ticket: Ticket
    
    @Field()
    messages: TicketMessage[]
}