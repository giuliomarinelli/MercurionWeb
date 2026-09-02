import { IsOptional } from "class-validator";
import type { RdkitBaseDTO as RdkitBaseContract } from '@mercurion/rest-contracts'

export class RdkitBaseDTO implements RdkitBaseContract {
  @IsOptional()
  accessToken?: string
}