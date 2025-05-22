import { InputType, Field, ID, } from '@nestjs/graphql';

@InputType()
export class CreateSectionInput {

  @Field(() => ID)
  chapterId: string

  @Field()
  title: string

  @Field({ nullable: true })
  description?: string
  
}
