import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";
import type { RdkitAreSameStructureDTO as RdkitSameStructureContract } from '@mercurion/rest-contracts'

export class RdkitAreSameStructureDTO extends RdkitBaseDTO implements RdkitSameStructureContract {
  @IsString()
  @Matches(/\S/, { message: "SMILES A cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES A too long" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  a: string

  @IsString()
  @Matches(/\S/, { message: "SMILES B cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES B too long" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  b: string
}
