import { Transform } from "class-transformer";
import { IsDefined, IsNotEmpty, IsString } from "class-validator";

export class RecoveryCodeDTO {
    @IsString()
    @IsDefined()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    code: string
}
