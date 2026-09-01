import { Transform } from "class-transformer";
import { IsEmail, IsString, Matches } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

export class RecoverCredentialsDTO {
    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeEmail(value) : value)
    newEmail: string

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)    
    newPassword: string
}
