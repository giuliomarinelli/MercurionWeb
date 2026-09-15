import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class SynthesisInput {

    @IsString()
    @Field() 
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    title: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true }) 
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    notes?: string | null
    
}
