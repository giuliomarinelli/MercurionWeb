import { ObjectType, Field } from "@nestjs/graphql";
import { MoleculeCollection } from "../entities/molecule-collection.entity";
import { PaginatedResponse } from "src/models/pagination/pagination.model";


@ObjectType()
export class PaginatedMoleculeCollection extends PaginatedResponse {

    @Field(() => [MoleculeCollection])
    items!: MoleculeCollection[]

}
