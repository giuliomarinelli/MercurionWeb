import { IsDefined, IsEnum, ValidateNested } from "class-validator";
import { VerifyKind } from "../enums/verify-kind.enum";
import { TotpBodyDTO } from "./totp.cls.dto";
import { BackupCodeDTO } from "./backup-code.cls.dto";

export class VerifyBodyDTO {
  @IsEnum(VerifyKind)
  kind: VerifyKind

  @IsDefined()
  @ValidateNested()
  payload: TotpBodyDTO | BackupCodeDTO
}
