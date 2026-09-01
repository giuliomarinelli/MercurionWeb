import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";

export class RdkitGetMoleculePropertiesDTO extends RdkitBaseDTO {
  @IsString()
  @Matches(/\S/, { message: "SMILES cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES too long" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smiles: string 
}
