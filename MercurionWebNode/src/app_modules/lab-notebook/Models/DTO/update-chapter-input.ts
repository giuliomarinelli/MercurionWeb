import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class UpdateChapterInput {
    
    @IsUUID()
    @Field(() => ID) 
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    id: string
    
    @IsOptional()
    @IsString()
    @Field({ nullable: true }) 
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    title?: string
    
    @IsOptional()
    @IsInt()
    @Field(() => Int, { nullable: true }) 
    order?: number
    
}
