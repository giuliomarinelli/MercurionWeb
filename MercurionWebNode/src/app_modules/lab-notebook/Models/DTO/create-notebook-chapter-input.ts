import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsString, IsUUID } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class CreateChapterInput {
    
    @IsUUID()
    @Field()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    notebookId: string
    @IsString()
    @Field()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    title: string
    
}
