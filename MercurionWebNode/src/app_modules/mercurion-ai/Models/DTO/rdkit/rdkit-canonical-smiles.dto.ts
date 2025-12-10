import { IsOptional, IsString, Matches, MaxLength, ValidateNested } from "class-validator";
import { RdkitBaseDTO } from "./rdkit-base.cls.dto";
import { Type } from "class-transformer";
import { RdkitToCanonicalSmilesOptsDTO } from "./rd-kit-canonical-smiles-opts.dto";

export class RdkitToCanonicalSmilesDTO extends RdkitBaseDTO {
  @IsString()
  @Matches(/\S/, { message: "SMILES cannot be empty or whitespace" })
  @MaxLength(4096, { message: "SMILES too long" })
  smiles: string

  @IsOptional()
  @ValidateNested()
  @Type(() => RdkitToCanonicalSmilesOptsDTO)
  opts?: RdkitToCanonicalSmilesOptsDTO
}