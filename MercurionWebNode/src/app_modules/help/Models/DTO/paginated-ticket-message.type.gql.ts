import { Field, Int, ObjectType } from "@nestjs/graphql";
import { FlatPagination } from "src/Models/flat-pagination.interface";
import { TicketMessage } from "../entities/ticket-message.entity";


@ObjectType()
export class PaginatedTicketMessage implements FlatPagination<TicketMessage> {
    @Field(() => [TicketMessage])
    items: TicketMessage[]

    @Field(() => Int)
    itemCount: number

    @Field(() => Int)
    totalItems: number

    @Field(() => Int)
    itemsPerPage: number

    @Field(() => Int)
    totalPages: number

    @Field(() => Int)
    currentPage: number
}