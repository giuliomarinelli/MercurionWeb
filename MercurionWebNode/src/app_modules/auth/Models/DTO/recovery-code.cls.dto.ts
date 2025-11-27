import { IsDefined, IsNotEmpty, IsString } from "class-validator";

export class RecoveryCodeDTO {
    @IsString()
    @IsDefined()
    @IsNotEmpty()
    code: string
}