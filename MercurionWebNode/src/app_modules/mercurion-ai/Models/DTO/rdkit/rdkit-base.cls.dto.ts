import { IsOptional } from "class-validator";

export class RdkitBaseDTO {
  @IsOptional()
  accessToken?: string
}