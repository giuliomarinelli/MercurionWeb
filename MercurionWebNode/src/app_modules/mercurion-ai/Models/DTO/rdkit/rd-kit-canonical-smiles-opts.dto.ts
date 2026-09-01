import { IsBoolean, IsOptional } from "class-validator";

export class RdkitToCanonicalSmilesOptsDTO {
  @IsOptional()
  @IsBoolean()
  isomeric?: boolean // default true lato py

  @IsOptional()
  @IsBoolean()
  kekule?: boolean   // default false lato py
}