import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";

@InputType()
export class UpdatePageInput {
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
  content?: string

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  order?: number
}
