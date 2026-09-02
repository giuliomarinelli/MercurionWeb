import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";
import type { RdkitGetMoleculePropertiesDTO as RdkitPropertiesContract } from '@mercurion/rest-contracts'

export class RdkitGetMoleculePropertiesDTO extends RdkitBaseDTO implements RdkitPropertiesContract {
  @IsString()
  @Matches(/\S/, { message: "SMILES cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES too long" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smiles: string 
}
