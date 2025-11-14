import { InputType, Field, ID, } from '@nestjs/graphql';
import { UUID } from 'crypto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class CreateSectionInput {

  @IsUUID()
  @Field(() => ID)
  chapterId: UUID

  @IsString()
  @Field()
  title: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  description?: string

}
