import { IsDefined, IsEnum } from "class-validator";
import { VerifyKind } from "../enums/verify-kind.enum";
import type {
  BackupCodeDTO,
  TotpBodyDTO,
  VerifyBodyDTO as VerifyBodyContract
} from '@mercurion/rest-contracts'

export class VerifyBodyDTO implements VerifyBodyContract {
  @IsEnum(VerifyKind)
  kind: VerifyKind

  @IsDefined()
  payload: TotpBodyDTO | BackupCodeDTO
}
