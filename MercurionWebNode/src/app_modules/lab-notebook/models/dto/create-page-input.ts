import { Field, ID, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";
import { IsMercurionPublicId } from "src/identifiers/mercurion-public-id";

@InputType()
export class CreatePageInput {

  @IsMercurionPublicId()
  @Field(() => ID)
  sectionId!: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  title?: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  content?: string

}
