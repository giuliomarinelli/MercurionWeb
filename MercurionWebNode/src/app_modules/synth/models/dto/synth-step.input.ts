import { Field, ID, InputType, Int } from "@nestjs/graphql"
import { Transform } from "class-transformer"
import { UUID } from "crypto"
import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator"
import { GeneralUtils } from "src/utils/general-utils/general-utils"

@InputType()
export class SynthStepInput {

    @IsUUID()
    @Field(() => ID) 
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    synthId: UUID

    @IsInt()
    @Min(0)
    @Field(() => Int) 
    order: number

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
}
