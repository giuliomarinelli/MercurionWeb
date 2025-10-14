import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CustomMoleculeItemInput {

    @Field(() => String)
    canonicalSmiles: string

    @Field(() => String, { nullable: true })
    label?: string

    @Field(() => String, { nullable: true })
    notes?: string

    @Field(() => String, { nullable: true })
    molFormula?: string

    @Field(() => String, { nullable: true })
    name?: string

    @Field(() => String, { nullable: true })
    propertiesJson?: string
}
