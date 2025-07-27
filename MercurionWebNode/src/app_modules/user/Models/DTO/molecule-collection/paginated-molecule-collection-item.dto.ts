import { Field, Int, ObjectType } from "@nestjs/graphql";
import { ChEMBLMoleculeItemDTO } from "./chembl-molecule-item.dto";
import { MoleculeCollectionItemUnion } from "./molecule-collection-item.union";
import { CustomMoleculeItemDTO } from "./custom-molecule-item.dto";

@ObjectType()
export class PaginatedMoleculeCollectionItem {

    @Field(() => [MoleculeCollectionItemUnion])
    items: Array<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO>

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
