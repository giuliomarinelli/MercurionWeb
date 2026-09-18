import { Field, ObjectType } from "@nestjs/graphql";
import { PaginatedResponse } from "src/models/pagination/pagination.model";
import { TicketResponse } from "./help-response.dto";

@ObjectType()
export class PaginatedTicket extends PaginatedResponse {
    @Field(() => [TicketResponse])
    items!: TicketResponse[]
}