import { ObjectType, Field, Int } from "@nestjs/graphql";
import { MoleculeCollection } from "../../entities/molecule-collection/molecule-collection.entity";


@ObjectType()
export class PaginatedMoleculeCollection {

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
