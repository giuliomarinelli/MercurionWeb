import { Field, ID, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, IsUUID } from "class-validator";

@InputType()
export class UpdateSectionInput {

  @IsUUID()
  @Field(() => ID)
  id: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  title?: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  description?: string

}
