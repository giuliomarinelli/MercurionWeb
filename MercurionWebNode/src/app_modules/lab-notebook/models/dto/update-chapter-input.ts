import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";
import { IsMercurionPublicId } from "src/identifiers/mercurion-public-id";

@InputType()
export class UpdateChapterInput {

    @IsMercurionPublicId()
    @Field(() => ID)
    id!: string

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
