import { InputType, Field, ID, } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { UUID } from 'crypto';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@InputType()
export class CreateSectionInput {

  @IsUUID()
  @Field(() => ID)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  chapterId: UUID

  @IsString()
  @Field()
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  title: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  description?: string

}
