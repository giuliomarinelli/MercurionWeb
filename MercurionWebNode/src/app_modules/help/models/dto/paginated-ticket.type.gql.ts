import { Field, Int, ObjectType } from "@nestjs/graphql";
import { FlatPagination } from "src/models/flat-pagination.interface";
import { TicketResponse } from "./help-response.dto";

@ObjectType()
export class PaginatedTicket implements FlatPagination<TicketResponse> {
    @Field(() => [TicketResponse])
    items!: TicketResponse[]

    @Field(() => Int)
    itemCount!: number

    @Field(() => Int)
    totalItems!: number

    @Field(() => Int)
    itemsPerPage!: number

    @Field(() => Int)
    totalPages!: number

    @Field(() => Int)
    currentPage!: number
}