import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class UpdateMoleculeCollectionInput {
  @Field(() => ID)
  id: string

  @Field({ nullable: true })
  name?: string
}