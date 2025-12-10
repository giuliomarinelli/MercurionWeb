import { IsString, Matches, MaxLength } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";

export class RdkitAreSameStructureDTO extends RdkitBaseDTO {
  @IsString()
  @Matches(/\S/, { message: "SMILES A cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES A too long" })
  a: string

  @IsString()
  @Matches(/\S/, { message: "SMILES B cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES B too long" })
  b: string
}