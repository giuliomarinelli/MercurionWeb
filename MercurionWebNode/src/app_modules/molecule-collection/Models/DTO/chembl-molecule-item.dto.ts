import { Field, ID, ObjectType } from "@nestjs/graphql";
import { UUID } from "crypto";
import { MoleculeDetail } from "src/app_modules/meilisearch/Models/DTO/molecule-detail.gql.dtos";
import { MoleculeCollectionItemJoin } from "../entities/molecule-collection-item-join.entity";

@ObjectType()
export class ChEMBLMoleculeItemDTO {


    @Field(() => ID)
    id: UUID

    @Field(() => String)
    chemblMolregno: number

    @Field(() => String, { nullable: true })
    label: string | null

    @Field(() => String, { nullable: true })
    notes: string | null

    @Field()
    type: string

    @Field(() => String)
    createdAt: number

    @Field(() => String)
    updatedAt: number
    
    @Field(() => String)
    touchedAt: number

    // --- Dettagli ChEMBL arricchiti ---
    @Field(() => MoleculeDetail, { nullable: true })
    chemblDetails?: MoleculeDetail

    @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
    joins: MoleculeCollectionItemJoin[] | null
}
