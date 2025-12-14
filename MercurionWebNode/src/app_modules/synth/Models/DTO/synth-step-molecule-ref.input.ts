import { Field, ID, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { MoleculeRole } from "../enums/molecule-role.enum";
import { UUID } from "crypto";
import { IsBoolean, IsEnum, IsUUID } from "class-validator";

@InputType()
export class SynthStepMoleculeRefInput {

  @IsUUID()
  @Field(() => ID)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  stepId: UUID

  @IsUUID()
  @Field(() => ID)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  moleculeId: UUID

  @IsEnum(MoleculeRole)
  @Field(() => MoleculeRole) 
  role: MoleculeRole

  @IsBoolean()
  @Field(() => Boolean)
  showAliasOnTheArrow: boolean

}
