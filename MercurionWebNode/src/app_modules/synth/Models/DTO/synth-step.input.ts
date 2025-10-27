import { Field, ID, InputType, Int } from "@nestjs/graphql"
import { UUID } from "crypto"

@InputType()
export class SynthStepInput {

    @Field(() => ID) 
    synthId: UUID

    @Field(() => Int) 
    order: number

    @Field(() => ID)
    mainSubstrateId: UUID
    
    @Field(() => ID)
    mainProductId: UUID

    @Field(() => String, { nullable: true }) 
    description: string | null
    
    @Field(() => String, { nullable: true }) 
    reactionType: string | null
    
    @Field(() => [String]) 
    conditions: string[]

}
