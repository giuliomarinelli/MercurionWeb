import { Field, ObjectType } from "@nestjs/graphql";
import { PaginatedResponse } from "src/models/pagination/pagination.model";
import { TicketMessageResponse } from "./help-response.dto";


@ObjectType()
export class PaginatedTicketMessage extends PaginatedResponse {
    @Field(() => [TicketMessageResponse])
    items!: TicketMessageResponse[]
}