import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Page {
  @Field(() => ID)
  id: string

  @Field(() => ID)
  sectionId: string

  @Field({ nullable: true })
  title?: string

  @Field({ nullable: true })
  content?: string

  @Field(() => Int, { nullable: true })
  order?: number

  @Field({ nullable: true })
  createdAt?: string

  @Field({ nullable: true })
  updatedAt?: string
}