import { Field, ObjectType } from "@nestjs/graphql";
import { ChEMBLMoleculeItemDTO } from "./chembl-molecule-item.dto";
import { MoleculeCollectionItemUnion } from "./molecule-collection-item.union";
import { CustomMoleculeItemDTO } from "./custom-molecule-item.dto";
import { PaginatedResponse } from "src/models/pagination/pagination.model";

@ObjectType()
export class PaginatedMoleculeCollectionItem extends PaginatedResponse {

    @Field(() => [MoleculeCollectionItemUnion])
    items!: Array<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO>

}
