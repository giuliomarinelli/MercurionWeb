import { InputType, Field, ID, } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { UUID } from 'crypto';
import { IsOptional, IsString } from 'class-validator';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { IsMercurionPublicId } from 'src/identifiers/mercurion-public-id';

@InputType()
export class CreateSectionInput {

  @IsMercurionPublicId()
  @Field(() => ID)
  chapterId!: UUID

  @IsString()
  @Field()
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  title!: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  description?: string

}
