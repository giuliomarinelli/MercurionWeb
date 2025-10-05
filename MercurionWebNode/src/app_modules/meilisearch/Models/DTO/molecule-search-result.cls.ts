import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class MoleculeSearchResult {

    @Field(() => Int)
    id: number

    @Field(() => String, { nullable: true })
    preferredName: string

    @Field(() => String, { nullable: true })
    smiles: string

    @Field(() => [String], { nullable: true })
    synonyms: string[]

    @Field(() => Float, { nullable: true })
    mwFreebase?: number

    @Field(() => Float, { nullable: true })
    alogp?: number

    @Field(() => Int, { nullable: true })
    maxPhase?: number

    @Field(() => Boolean, { defaultValue: false })
    known: boolean

}
