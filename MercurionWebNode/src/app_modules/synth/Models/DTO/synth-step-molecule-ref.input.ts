import { Field, ID, InputType } from "@nestjs/graphql";
import { MoleculeRole } from "../enums/molecule-role.enum";
import { UUID } from "crypto";
import { IsBoolean, IsEnum, IsUUID } from "class-validator";

@InputType()
export class SynthStepMoleculeRefInput {

  @IsUUID()
  @Field(() => ID)
  stepId: UUID

  @IsUUID()
  @Field(() => ID)
  moleculeId: UUID

  @IsEnum(MoleculeRole)
  @Field(() => MoleculeRole) 
  role: MoleculeRole

  @IsBoolean()
  @Field(() => Boolean)
  showAliasOnTheArrow: boolean

}
