import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsString } from "class-validator";
import { IsMercurionPublicId } from "src/identifiers/mercurion-public-id";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class CreateChapterInput {

    @IsMercurionPublicId()
    @Field()
    notebookId!: string
    @IsString()
    @Field()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    title!: string

}
