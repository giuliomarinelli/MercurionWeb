import { Field, Int, ObjectType } from "@nestjs/graphql";
import { FlatPagination } from "src/models/flat-pagination.interface";
import { TicketMessageResponse } from "./help-response.dto";


@ObjectType()
export class PaginatedTicketMessage implements FlatPagination<TicketMessageResponse> {
    @Field(() => [TicketMessageResponse])
    items!: TicketMessageResponse[]

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