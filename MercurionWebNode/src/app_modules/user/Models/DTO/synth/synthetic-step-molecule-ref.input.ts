import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class SyntheticStepMoleculeRefInput {
  @Field(() => ID) stepId: string
  @Field(() => ID) moleculeId: string
  @Field() role: string
  @Field(() => String, { nullable: true }) alias?: string | null
}