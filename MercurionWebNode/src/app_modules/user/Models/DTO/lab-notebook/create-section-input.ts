import { InputType, Field, ID, } from '@nestjs/graphql';
import { UUID } from 'crypto';

@InputType()
export class CreateSectionInput {

  @Field(() => ID)
  chapterId: UUID

  @Field()
  title: string

  @Field({ nullable: true })
  description?: string
  
}
