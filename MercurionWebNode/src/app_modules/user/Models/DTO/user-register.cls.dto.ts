import { IsEmail, IsEnum, IsOptional, IsString, Matches } from "class-validator"
import { UserGender } from "../enums/user-gender.enum"

export class UserRegisterDTO {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    email: string 

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)
    password: string 

    @IsString()
    @Matches(/^[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*$/)
    firstName: string

    @IsEnum(UserGender)
    gender: UserGender

    @IsString()
    @Matches(/^[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*$/)
    lastName: string
    
    @IsString()
    @Matches(/^(?:[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*)?$/)
    @IsOptional()
    job?: string

}
