import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class MoleculeSearchResult {

    @Field(() => Int)
    id: number

    @Field()
    preferredName: string

    @Field()
    canonicalSmiles: string

    @Field(() => [String])
    synonyms: string[]

    @Field(() => Float, { nullable: true })
    mwFreebase?: number

    @Field(() => Float, { nullable: true })
    alogp?: number

    @Field(() => Int, { nullable: true })
    maxPhase?: number

}
