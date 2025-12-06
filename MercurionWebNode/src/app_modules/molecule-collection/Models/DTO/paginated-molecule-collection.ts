import { ObjectType, Field, Int } from "@nestjs/graphql";
import { MoleculeCollection } from "../entities/molecule-collection.entity";
import { FlatPagination } from "src/Models/flat-pagination.interface";


@ObjectType()
export class PaginatedMoleculeCollection implements FlatPagination<MoleculeCollection> {

    @Field(() => [MoleculeCollection])
    items: MoleculeCollection[]

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
