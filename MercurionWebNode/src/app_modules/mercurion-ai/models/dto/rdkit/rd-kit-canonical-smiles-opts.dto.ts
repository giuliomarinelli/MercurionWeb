import { IsBoolean, IsOptional } from "class-validator";
import type { RdkitToCanonicalSmilesOptsDTO as RdkitOptsContract } from '@mercurion/rest-contracts'

export class RdkitToCanonicalSmilesOptsDTO implements RdkitOptsContract {
  @IsOptional()
  @IsBoolean()
  isomeric?: boolean // default true lato py

  @IsOptional()
  @IsBoolean()
  kekule?: boolean   // default false lato py
}