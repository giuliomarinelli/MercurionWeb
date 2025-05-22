import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class CreatePageInput {ù

  @Field(() => ID)
  sectionId: string

  @Field({ nullable: true })
  title?: string

  @Field({ nullable: true })
  content?: string

}