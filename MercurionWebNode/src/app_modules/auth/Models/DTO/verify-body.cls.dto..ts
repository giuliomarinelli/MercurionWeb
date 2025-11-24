import { IsDefined, IsEnum } from "class-validator";
import { VerifyKind } from "../enums/verify-kind.enum";

export class VerifyBodyDTO {
  @IsEnum(VerifyKind)
  kind: VerifyKind

  @IsDefined()
  payload: unknown
}
