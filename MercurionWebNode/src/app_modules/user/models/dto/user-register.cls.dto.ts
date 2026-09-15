import { Transform } from "class-transformer"
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from "class-validator"
import { UserGender } from "../enums/user-gender.enum"
import { GeneralUtils } from "src/utils/general-utils/general-utils"
import type { UserRegisterDTO as UserRegisterContract } from '@mercurion/rest-contracts'

export class UserRegisterDTO implements UserRegisterContract {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeEmail(value) : value)
    email: string 

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)
    password: string 

    @IsString()
    @Matches(/^[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*$/)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizePersonName(value) : value)
    firstName: string

    @IsEnum(UserGender)
    gender: UserGender

    @IsString()
    @Matches(/^[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*$/)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizePersonName(value) : value)
    lastName: string
    
    @IsString()
    @Matches(/^(?:[A-Za-zÀ-Ýà-ÿ]+(?:\s+[A-Za-zÀ-Ýà-ÿ]+)*)?$/)
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    job?: string | null

}
