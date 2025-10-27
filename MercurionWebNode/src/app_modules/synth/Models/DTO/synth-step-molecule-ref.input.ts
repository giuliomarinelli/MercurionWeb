import { Field, ID, InputType } from "@nestjs/graphql";
import { MoleculeRole } from "../enums/molecule-role.enum";
import { UUID } from "crypto";

@InputType()
export class SynthStepMoleculeRefInput {

  @Field(() => ID)
  stepId: UUID

  @Field(() => ID)
  moleculeId: UUID

  @Field(() => MoleculeRole) 
  role: MoleculeRole

  @Field(() => Boolean)
  showAliasOnTheArrow: boolean

}