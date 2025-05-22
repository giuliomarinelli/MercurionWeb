import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class UpdateSectionInput {

  @Field(() => ID)
  id: string

  @Field({ nullable: true })
  title?: string

  @Field({ nullable: true })
  description?: string

}