import { Transform, Type } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, ValidateNested } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";
import { RdkitToCanonicalSmilesOptsDTO } from "./rd-kit-canonical-smiles-opts.dto";
import {
  RDKIT_SMILES_MAX_LENGTH,
  type RdkitToCanonicalSmilesDTO as RdkitCanonicalContract
} from '@mercurion/rest-contracts'

export class RdkitToCanonicalSmilesDTO extends RdkitBaseDTO implements RdkitCanonicalContract {
  @IsString()
  @Matches(/\S/, { message: "SMILES cannot be empty or whitespace" })
  @MaxLength(RDKIT_SMILES_MAX_LENGTH, { message: "SMILES too long" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  smiles: string

  @IsOptional()
  @ValidateNested()
  @Type(() => RdkitToCanonicalSmilesOptsDTO)
  opts?: RdkitToCanonicalSmilesOptsDTO
}
