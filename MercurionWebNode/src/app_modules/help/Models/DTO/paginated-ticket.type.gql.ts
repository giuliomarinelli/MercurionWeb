import { Field, Int, ObjectType } from "@nestjs/graphql";
import { FlatPagination } from "src/Models/flat-pagination.interface";
import { Ticket } from "../entities/ticket.entity";

@ObjectType()
export class PaginatedTicket implements FlatPagination<Ticket> {
    @Field(() => [Ticket])
    items: Ticket[]

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