import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { UserGender } from "src/app_modules/user/Models/enums/user-gender.enum"
import { nullish } from "src/Models/nullish.type"


export interface ProfileDTO {
    firstName: string
    lastName: string
    gender: UserGender
    job: string | nullish
    obscuredEmail: string
    obscuredPhone: string | null
}

export class ProfileRegistryDTO {
   
    @IsString()
    @IsNotEmpty()
    firstName: string

    @IsString()
    @IsNotEmpty()
    lastName: string

    @IsEnum(UserGender)
    gender: UserGender

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    job?: string | null

}