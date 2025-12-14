import { Field, ID, InputType, Int } from "@nestjs/graphql"
import { Transform } from "class-transformer"
import { UUID } from "crypto"
import { IsArray, IsInt, IsOptional, IsString, IsUUID } from "class-validator"
import { GeneralUtils } from "src/utils/general-utils/general-utils"

@InputType()
export class SynthStepInput {

    @IsUUID()
    @Field(() => ID) 
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    synthId: UUID

    @IsInt()
    @Field(() => Int) 
    order: number

    @IsUUID()
    @Field(() => ID)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    mainSubstrateId: UUID
    
    @IsUUID()
    @Field(() => ID)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    mainProductId: UUID

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true }) 
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    description: string | null
    
    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true }) 
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    reactionType: string | null
    
    @IsArray()
    @IsString({ each: true })
    @Field(() => [String]) 
    @Transform(({ value }) => Array.isArray(value) ? value.map((v) => typeof v === 'string' ? v.trim() : v) : value)
    conditions: string[]

}
