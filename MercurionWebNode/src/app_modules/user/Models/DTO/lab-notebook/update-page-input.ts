import { Field, ID, InputType, Int } from "@nestjs/graphql";

@InputType()
export class UpdatePageInput {
  @Field(() => ID)
  id: string

  @Field({ nullable: true })
  title?: string

  @Field({ nullable: true })
  content?: string

  @Field(() => Int, { nullable: true })
  order?: number
}