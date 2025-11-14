import { Field, ID, InputType, Int } from "@nestjs/graphql"
import { UUID } from "crypto"
import { IsArray, IsInt, IsOptional, IsString, IsUUID } from "class-validator"

@InputType()
export class SynthStepInput {

    @IsUUID()
    @Field(() => ID) 
    synthId: UUID

    @IsInt()
    @Field(() => Int) 
    order: number

    @IsUUID()
    @Field(() => ID)
    mainSubstrateId: UUID
    
    @IsUUID()
    @Field(() => ID)
    mainProductId: UUID

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true }) 
    description: string | null
    
    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true }) 
    reactionType: string | null
    
    @IsArray()
    @IsString({ each: true })
    @Field(() => [String]) 
    conditions: string[]

}
