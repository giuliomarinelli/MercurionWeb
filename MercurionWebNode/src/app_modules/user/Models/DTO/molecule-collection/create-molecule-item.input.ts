// CreateMoleculeItemInput
import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class CreateMoleculeItemInput {

    @Field(() => String)
    type: string // 'custom' o 'chembl'

    @Field(() => String, { nullable: true })
    canonicalSmiles?: string

    @Field(() => String, { nullable: true })
    molFormula?: string

    @Field(() => String, { nullable: true })
    name?: string

    @Field(() => String, { nullable: true })
    propertiesJson?: string

    @Field(() => Number, { nullable: true })
    chemblMolregno?: number

    @Field(() => String, { nullable: true })
    label?: string

    @Field(() => String, { nullable: true })
    notes?: string
}
