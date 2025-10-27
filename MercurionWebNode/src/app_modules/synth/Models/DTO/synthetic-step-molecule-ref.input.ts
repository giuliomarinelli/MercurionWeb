import { Field, ID, InputType } from "@nestjs/graphql";
import { MoleculeRole } from "../enums/molecule-role.enum";

@InputType()
export class SyntheticStepMoleculeRefInput {
  @Field(() => ID) stepId: string
  @Field(() => ID) moleculeId: string
  @Field(() => MoleculeRole) role: MoleculeRole
  @Field(() => String, { nullable: true }) alias?: string | null
}