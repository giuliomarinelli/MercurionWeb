import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";
import {
  RDKIT_SMILES_MAX_LENGTH,
  type RdkitGetMoleculePropertiesDTO as RdkitPropertiesContract
} from '@mercurion/rest-contracts'

export class RdkitGetMoleculePropertiesDTO extends RdkitBaseDTO implements RdkitPropertiesContract {
  @IsString()
  @Matches(/\S/, { message: "SMILES cannot be empty or whitespace" })
  @MaxLength(RDKIT_SMILES_MAX_LENGTH, { message: "SMILES too long" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smiles: string 
}
