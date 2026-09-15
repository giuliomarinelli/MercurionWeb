import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsString } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class CreateLabNotebookInput {

    @IsString()
    @Field()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    title: string

}
