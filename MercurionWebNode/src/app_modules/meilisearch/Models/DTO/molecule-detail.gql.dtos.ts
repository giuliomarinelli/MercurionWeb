import { Field, Float, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class MoleculeProperties {
    @Field(() => Float, { nullable: true }) mwFreebase: number | null
    @Field(() => Float, { nullable: true }) alogp: number | null
    @Field(() => Int, { nullable: true }) hba: number | null
    @Field(() => Int, { nullable: true }) hbd: number | null
    @Field(() => Float, { nullable: true }) psa: number | null
    @Field(() => Int, { nullable: true }) rtb: number | null
}

@ObjectType()
export class AdministrationRoutes {
    @Field() oral: boolean
    @Field() parenteral: boolean
    @Field() topical: boolean
}

@ObjectType()
export class MoleculeDetail {
    @Field(() => Int) id: number
    @Field() cmbId: string
    @Field() preferredName: string
    @Field() canonicalSmiles: string
    @Field(() => MoleculeProperties) properties: MoleculeProperties
    @Field(() => Float, { nullable: true }) maxPhase: number | null
    @Field() moleculeType: string
    @Field(() => AdministrationRoutes) administrationRoutes: AdministrationRoutes
    @Field() naturalProduct: boolean
    @Field() prodrug: boolean
    @Field() blackBoxWarning: boolean
    @Field(() => [String]) synonyms: string[]
}
