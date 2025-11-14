import { Field, ID, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, IsUUID } from "class-validator";

@InputType()
export class CreatePageInput {

  @IsUUID()
  @Field(() => ID)
  sectionId: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  title?: string

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  content?: string

}
