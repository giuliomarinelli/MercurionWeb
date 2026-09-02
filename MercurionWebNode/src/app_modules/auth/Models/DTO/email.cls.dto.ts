import { Transform } from "class-transformer";
import { IsEmail, IsString, Matches } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";
import type { EmailDTO as EmailContract } from '@mercurion/rest-contracts'

export class EmailDTO implements EmailContract {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeEmail(value) : value)
    email: string

}
