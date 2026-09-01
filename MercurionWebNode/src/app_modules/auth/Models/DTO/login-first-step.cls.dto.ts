import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsBoolean, IsString, Matches } from 'class-validator'
import { GeneralUtils } from 'src/utils/general-utils/general-utils'
import type { Login_FirstStepDTO as LoginFirstStepContract } from '@mercurion/rest-contracts'

export class Login_FirstStepDTO implements LoginFirstStepContract {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeEmail(value) : value)
    email: string

    @IsNotEmpty()
    @IsString()
    password: string

    @IsBoolean()
    @Transform(({ value }) => value === true || value === 'true')
    remember: boolean

}
