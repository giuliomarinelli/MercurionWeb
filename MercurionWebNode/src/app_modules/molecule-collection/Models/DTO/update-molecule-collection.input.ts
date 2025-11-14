import { Field, ID, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, IsUUID } from "class-validator";

@InputType()
export class UpdateMoleculeCollectionInput {
  @IsUUID()
  @Field(() => ID)
  id: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  name?: string
}
