import { ArgsType, Field } from "@nestjs/graphql"
import { IsString } from "class-validator"

@ArgsType()
export class CanonicalSmilesArgs {
  @Field(() => String, { nullable: false })
  @IsString()
  canonicalSmiles!: string
}